"use client";

import { useEffect, useState } from "react";
import { Modal } from "./Modal";
import { Button } from "./Button";

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  fileType: string;
  fileName: string;
  downloadUrl: string | null;
  loading: boolean;
}

export function PreviewModal({
  open,
  onClose,
  fileType,
  fileName,
  downloadUrl,
  loading,
}: PreviewModalProps) {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);

  const isText = fileType === "txt" || fileType === "md" || fileType === "markdown";
  const isPdf = fileType === "pdf";

  useEffect(() => {
    if (!open || !downloadUrl || !isText) {
      setTextContent(null);
      return;
    }
    setTextLoading(true);
    fetch(downloadUrl)
      .then((res) => res.text())
      .then(setTextContent)
      .catch(() => setTextContent("Could not load file content."))
      .finally(() => setTextLoading(false));
  }, [open, downloadUrl, isText]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border rounded-lg w-full max-w-3xl h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-medium text-foreground truncate">{fileName}</h3>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="flex-1 overflow-auto">
          {loading && (
            <p className="text-muted text-sm p-4">Loading preview...</p>
          )}

          {!loading && isPdf && downloadUrl && (
            <embed
              src={downloadUrl}
              type="application/pdf"
              className="w-full h-full"
            />
          )}

          {!loading && isText && (
            <pre className="whitespace-pre-wrap text-sm text-foreground p-4 font-mono">
              {textLoading ? "Loading..." : textContent}
            </pre>
          )}

          {!loading && !isPdf && !isText && (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <p className="text-muted text-sm">
                Preview isn&apos;t available for this file type.
              </p>
              {downloadUrl && (
                <a href={downloadUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="secondary">Open in new tab</Button>
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}