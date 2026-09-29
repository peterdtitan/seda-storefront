import { UPLOAD_MAX_BYTES } from "./limits";

/**
 * Shrinks a photograph in the browser before it is uploaded.
 *
 * A photo straight off a phone runs to eight or twelve megabytes, and no amount of
 * server configuration will carry that through a server action. Telling the owner to
 * go and export it smaller is not a fix — it is the job moved onto someone who did
 * not sign up for it. So I resize here instead. The shop never serves anything above
 * 2400px on the long edge, so for the photograph as published nothing is lost.
 *
 * Only ever called with a file the person just chose, so the decode happens on a
 * bitmap the browser already has to read anyway.
 */

const LONG_EDGE = 2400;

// Each pass drops the quality and then the dimensions. Three is enough to bring a
// 12MP photograph under four megabytes with room to spare; the loop exists for the
// awkward ones, like a flat-lit studio shot on a plain ground that compresses badly.
const PASSES = [
  { edge: LONG_EDGE, quality: 0.86 },
  { edge: LONG_EDGE, quality: 0.72 },
  { edge: 1800, quality: 0.66 },
];

export async function downscale(file: File, maxBytes = UPLOAD_MAX_BYTES): Promise<File> {
  // Already small enough. Re-encoding it would only spend another generation of
  // compression artefacts to arrive back where we started.
  if (file.size <= maxBytes) return file;

  // No createImageBitmap, or a format this browser cannot decode: hand the original
  // back and let the server answer with the size message. Better a clear refusal
  // than a half-rendered canvas.
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    // from-image so a photograph shot in portrait does not arrive on its side. The
    // EXIF orientation flag is dropped by the canvas, so it has to be applied here.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    let smallest: Blob | null = null;

    for (const pass of PASSES) {
      const blob = await render(bitmap, pass.edge, pass.quality);
      if (!blob) break;
      if (!smallest || blob.size < smallest.size) smallest = blob;
      if (blob.size <= maxBytes) return named(file, blob);
    }

    // Still too heavy after every pass. Send the smallest version anyway: it gives
    // the server something honest to measure, and the message it returns then names
    // a real number rather than the size of the original.
    return smallest ? named(file, smallest) : file;
  } finally {
    bitmap.close();
  }
}

function render(bitmap: ImageBitmap, edge: number, quality: number): Promise<Blob | null> {
  const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext("2d");
  if (!context) return Promise.resolve(null);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  // WebP rather than JPEG so a cut-out on a transparent ground does not come back
  // with a black square behind it. A browser that cannot encode it falls back to PNG
  // on its own, which the extension below then has to agree with.
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

function named(original: File, blob: Blob): File {
  const base = original.name.replace(/\.[^.]+$/, "") || "photograph";
  const ext = blob.type === "image/webp" ? "webp" : blob.type === "image/jpeg" ? "jpg" : "png";
  return new File([blob], `${base}.${ext}`, { type: blob.type });
}
