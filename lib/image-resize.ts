/**
 * Shrinks a phone photo before upload: longest edge at most `maxEdge` px,
 * saved as JPEG. A 3–5 MB camera photo comes out at roughly 150–300 KB.
 * Returns a data URL.
 */
export async function resizePhoto(
  file: File,
  maxEdge = 1024,
  quality = 0.8
): Promise<string> {
  // createImageBitmap applies the EXIF rotation, so portrait photos stay upright.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Foto tidak bisa diproses di HP ini.");
    // JPEG has no transparency; a white background keeps PNG cut-outs readable.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    bitmap.close();
  }
}
