import "server-only";

import { canWriteToSanity, writeClient } from "@/sanity/lib/writeClient";

import { UPLOAD_MAX_BYTES } from "./limits";

/**
 * Photographs go into Sanity's asset store, which is the one part of the CMS the
 * storefront cannot do without: it is where the CDN, the crop and the blur placeholder
 * come from. The owner never sees any of that — they choose a file, and the upload
 * happens server side under the application's token.
 */

// Allowlist rather than a blocklist, and checked server side. A browser accept=""
// attribute is a suggestion; this is the rule.
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export type UploadResult =
  { ok: true; assetId: string; width: number; height: number } | { ok: false; message: string };

export async function uploadImage(file: File): Promise<UploadResult> {
  if (!canWriteToSanity || !writeClient) {
    return { ok: false, message: "No Sanity write token is configured, so nothing can upload." };
  }

  if (!file || file.size === 0) return { ok: false, message: "That file was empty." };

  if (!ALLOWED.has(file.type)) {
    return {
      ok: false,
      message: `${file.type || "That file"} is not an image the shop can serve. Use a JPEG, PNG, WebP or AVIF.`,
    };
  }

  // The browser shrinks anything oversized before it gets here, so reaching this is
  // either a photograph that would not compress or a request that did not come from
  // the form. Either way it cannot be carried, and saying so beats a failed upload.
  if (file.size > UPLOAD_MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    const limit = (UPLOAD_MAX_BYTES / 1024 / 1024).toFixed(0);
    return {
      ok: false,
      message: `${mb}MB is over the ${limit}MB limit, even after resizing. Export it at around 2400px on the long edge — the shop never serves it larger.`,
    };
  }

  try {
    const asset = await writeClient.assets.upload("image", Buffer.from(await file.arrayBuffer()), {
      filename: file.name,
      contentType: file.type,
    });

    return {
      ok: true,
      assetId: asset._id,
      width: asset.metadata?.dimensions?.width ?? 0,
      height: asset.metadata?.dimensions?.height ?? 0,
    };
  } catch (error) {
    console.error("[catalogue] upload failed", error);
    return { ok: false, message: "Sanity would not take the file. Try again in a moment." };
  }
}
