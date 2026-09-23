import { apiFetch } from "./api";

export interface UploadLimits {
  max_upload_size_mb: number;
  allowed_extensions: string[];
}

export function getUploadLimits() {
  return apiFetch<UploadLimits>("/config/upload-limits", { skipAuth: true });
}