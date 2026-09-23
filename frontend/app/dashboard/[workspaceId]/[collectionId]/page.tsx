"use client";

import {useEffect, useRef, useState} from "react";
import {useParams, useRouter} from "next/navigation";
import Link from "next/link";
import {getCollection, deleteCollection, Collection} from "@/lib/collections";
import {
    listDocuments,
    uploadDocument,
    getDownloadUrl,
    deleteDocument,
    Document,
} from "@/lib/documents";
import { replaceDocument, listDocumentVersions, getVersionDownloadUrl, DocumentVersion } from "@/lib/documents";
import {formatFileSize} from "@/lib/format";
import {Button} from "@/components/Button";
import {Card} from "@/components/Card";
import {getUploadLimits, UploadLimits} from "@/lib/config";
import {PreviewModal} from "@/components/PreviewModal";
import {Input} from "@/components/Input";
import {Modal} from "@/components/Modal";
import { Eye, Download, RefreshCw, History, Trash2 } from "lucide-react";

export default function CollectionDetailPage() {
    const {workspaceId, collectionId} = useParams<{
        workspaceId: string;
        collectionId: string;
    }>();
    const router = useRouter();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [collection, setCollection] = useState<Collection | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [uploadLimits, setUploadLimits] = useState<UploadLimits | null>(null);
    const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [search, setSearch] = useState("");

    const [versionsDoc, setVersionsDoc] = useState<Document | null>(null);
    const [versions, setVersions] = useState<DocumentVersion[]>([]);
    const replaceInputRef = useRef<HTMLInputElement>(null);
    const [replacingDocId, setReplacingDocId] = useState<string | null>(null);

    function loadDocuments(searchTerm?: string) {
        listDocuments(workspaceId, collectionId, searchTerm)
            .then(setDocuments)
            .catch((err) => setError(err.message));
    }

    useEffect(() => {
        getCollection(workspaceId, collectionId)
            .then(setCollection)
            .catch((err) => setError(err.message));
        getUploadLimits().then(setUploadLimits).catch(() => {
        });
    }, [workspaceId, collectionId]);

      useEffect(() => {
          const timeout = setTimeout(() => {
              loadDocuments(search || undefined);
          }, 400);
          return () => clearTimeout(timeout);
          // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [search]);

    async function handleDeleteCollection() {
        if (!confirm("Delete this collection? This cannot be undone.")) return;
        try {
            await deleteCollection(workspaceId, collectionId);
            router.push(`/dashboard/${workspaceId}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
        }
    }

    async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadError(null);
        try {
            await uploadDocument(workspaceId, collectionId, file);
            loadDocuments();
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Upload failed");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    async function handleDownload(documentId: string, filename: string) {
        try {
            const {download_url} = await getDownloadUrl(workspaceId, collectionId, documentId);

            const fileRes = await fetch(download_url);
            const blob = await fileRes.blob();

            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Download failed");
        }
    }

    async function handleDeleteDocument(documentId: string) {
        if (!confirm("Delete this document?")) return;
        try {
            await deleteDocument(workspaceId, collectionId, documentId);
            loadDocuments();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Delete failed");
        }
    }

    async function handlePreview(doc: Document) {
        setPreviewDoc(doc);
        setPreviewLoading(true);
        setPreviewUrl(null);
        try {
            const {download_url} = await getDownloadUrl(workspaceId, collectionId, doc.id);
            setPreviewUrl(download_url);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Failed to load preview");
            setPreviewDoc(null);
        } finally {
            setPreviewLoading(false);
        }
    }

    async function handleReplaceSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file || !replacingDocId) return;
        try {
            await replaceDocument(workspaceId, collectionId, replacingDocId, file);
            loadDocuments(search || undefined);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Replace failed");
        } finally {
            setReplacingDocId(null);
            if (replaceInputRef.current) replaceInputRef.current.value = "";
        }
    }

    async function handleShowVersions(doc: Document) {
        setVersionsDoc(doc);
        try {
            const v = await listDocumentVersions(workspaceId, collectionId, doc.id);
            setVersions(v);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Failed to load versions");
        }
    }

    async function handleDownloadVersion(versionId: string, versionNumber: number) {
        if (!versionsDoc) return;
        try {
            const {download_url} = await getVersionDownloadUrl(
                workspaceId, collectionId, versionsDoc.id, versionId
            );
            const fileRes = await fetch(download_url);
            const blob = await fileRes.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = blobUrl;
            link.download = `v${versionNumber}_${versionsDoc.original_filename}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Download failed");
        }
    }

    if (error) return <p className="text-danger">{error}</p>;
    if (!collection) return <p className="text-muted">Loading...</p>;

    return (
        <div>
            <Link
                href={`/dashboard/${workspaceId}`}
                className="text-sm text-muted hover:text-foreground"
            >
                ← Back to workspace
            </Link>

            <Card className="w-full mt-4">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-xl font-medium text-foreground">{collection.name}</h1>
                        {collection.description && (
                            <p className="text-sm text-muted mt-1">{collection.description}</p>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Link href={`/dashboard/${workspaceId}/${collectionId}/edit`}>
                            <Button variant="secondary">Edit</Button>
                        </Link>
                        <Button variant="danger" onClick={handleDeleteCollection}>
                            Delete
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="flex items-center justify-between mt-8 mb-2">
                <h2 className="text-lg font-medium text-foreground">Documents</h2>
                <div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={uploadLimits ? uploadLimits.allowed_extensions.map((e) => `.${e}`).join(",") : undefined}
                        onChange={handleFileSelected}
                        className="hidden"
                        id="file-upload"
                    />
                    <input
                        ref={replaceInputRef}
                        type="file"
                        onChange={handleReplaceSelected}
                        className="hidden"
                    />
                    <label htmlFor="file-upload">
                        <Button
                            type="button"
                            disabled={uploading}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {uploading ? "Uploading..." : "+ Upload document"}
                        </Button>
                    </label>
                </div>
            </div>

            <p className="text-xs text-muted mb-1">
                {uploadLimits
                    ? `${uploadLimits.allowed_extensions.map((e) => e.toUpperCase()).join(", ")} — up to ${uploadLimits.max_upload_size_mb}MB`
                    : ""}
            </p>
            {uploadError && <p className="text-xs text-danger mb-4">{uploadError}</p>}
            <Input
                type="text"
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="mb-4"
            />
            <div className="flex flex-col gap-3">
                {documents.map((doc) => (
                    <Card key={doc.id} className="w-full flex items-center justify-between">
                        <div>
                            <h3 className="font-medium text-foreground">{doc.name}</h3>
                            <p className="text-xs text-muted mt-1">
                                {doc.file_type.toUpperCase()} · {formatFileSize(doc.file_size)} ·
                                v{doc.version_number} ·{" "}
                                {new Date(doc.created_at).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="secondary"
                                title="Preview"
                                onClick={() => handlePreview(doc)}
                            >
                                <Eye size={16}/>
                            </Button>
                            <Button
                                variant="secondary"
                                title="Download"
                                onClick={() => handleDownload(doc.id, doc.original_filename)}
                            >
                                <Download size={16}/>
                            </Button>
                            <Button
                                variant="secondary"
                                title="Replace"
                                onClick={() => {
                                    setReplacingDocId(doc.id);
                                    replaceInputRef.current?.click();
                                }}
                            >
                                <RefreshCw size={16}/>
                            </Button>
                            <Button
                                variant="secondary"
                                title="Version history"
                                onClick={() => handleShowVersions(doc)}
                            >
                                <History size={16}/>
                            </Button>
                            <Button
                                variant="danger"
                                title="Delete"
                                onClick={() => handleDeleteDocument(doc.id)}
                            >
                                <Trash2 size={16}/>
                            </Button>
                        </div>
                    </Card>
                ))}
                {documents.length === 0 && (
                    <p className="text-muted text-sm">No documents yet — upload your first one.</p>
                )}
            </div>
            <PreviewModal
                open={previewDoc !== null}
                onClose={() => setPreviewDoc(null)}
                fileType={previewDoc?.file_type || ""}
                fileName={previewDoc?.name || ""}
                downloadUrl={previewUrl}
                loading={previewLoading}
            />
            <Modal open={versionsDoc !== null} onClose={() => setVersionsDoc(null)}>
                <h2 className="text-lg font-medium text-foreground mb-4 break-words">
                    Version history — {versionsDoc?.name}
                </h2>
                <div className="flex flex-col gap-2 max-h-96 overflow-auto">
                    <div className="flex items-center justify-between px-3 py-2 rounded bg-background">
            <span className="text-sm text-foreground">
              v{versionsDoc?.version_number} (current)
            </span>
                    </div>
                    {versions.map((v) => (
                        <div key={v.id} className="flex items-center justify-between px-3 py-2 rounded bg-background">
                            <div>
                                <span className="text-sm text-foreground">v{v.version_number}</span>
                                <span className="text-xs text-muted ml-2">
                  {formatFileSize(v.file_size)} · {new Date(v.created_at).toLocaleDateString()}
                </span>
                            </div>
                            <Button
                                variant="secondary"
                                title="Download this version"
                                onClick={() => handleDownloadVersion(v.id, v.version_number)}
                            >
                                <Download size={16}/>
                            </Button>
                        </div>
                    ))}
                    {versions.length === 0 && (
                        <p className="text-muted text-sm">No previous versions yet.</p>
                    )}
                </div>
            </Modal>
        </div>
    );
}