import "server-only";

import { canWriteToSanity, writeClient } from "@/sanity/lib/writeClient";

/**
 * Photographs go into Sanity's asset store, which is the one part of the CMS the
 * storefront cannot do without: it is where the CDN, the crop and the blur placeholder
 * come from. The owner never sees any of that — they choose a file, and the upload
 * happens server side under the application's token.
 */

const MAX_BYTES = 12 * 1024 * 1024;

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

  if (file.size > MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1);
    return {
      ok: false,
      message: `${mb}MB is over the 12MB limit. Export it at around 2400px on the long edge — the shop never serves it larger.`,
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
