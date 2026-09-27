/*
  Multipart upload for the console.

  Kept separate from adminFetch on purpose: adminFetch always sends
  Content-Type: application/json, and setting that header on a FormData body
  strips the multipart boundary — the server then sees no file at all. Here the
  browser sets the header (with boundary) itself, and we only add the bearer
  token.

  Backend contract: POST /admin/uploads, field name "file"
    -> 201 { storage_key, title, mime, size_bytes }
  The returned storage_key is then registered with POST /admin/materials.
*/

import { adminToken, AdminApiError, apiUrl } from "./admin";

export type UploadedFile = {
  storage_key: string;
  title: string;
  mime: string;
  size_bytes: number;
};

export async function uploadFile(file: File): Promise<UploadedFile> {
  const token = adminToken();
  if (!token) throw new AdminApiError("Not logged in. Please log in as admin.", 401);
  if (!apiUrl) throw new AdminApiError("API URL is not configured.", 0);

  const form = new FormData();
  form.append("file", file);

  let r: Response;
  try {
    r = await fetch(`${apiUrl}/admin/uploads`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    });
  } catch {
    throw new AdminApiError("Could not reach the API while uploading.", 0);
  }

  const body = await r.json().catch(() => ({}));
  if (!r.ok) {
    /* These are the two failures an admin can actually fix, so say what to do
       rather than repeating the HTTP status. */
    if (r.status === 503) {
      throw new AdminApiError("File storage is not configured on the server (R2 credentials missing).", 503);
    }
    if (r.status === 413) {
      throw new AdminApiError("That file is larger than the 200 MB limit.", 413);
    }
    throw new AdminApiError(body?.error ?? "Upload failed.", r.status, body ?? {});
  }
  return body as UploadedFile;
}
