const DEFAULT_TARGET_MAX_BYTES = 600 * 1024;
const DEFAULT_OUTPUT_MIME_TYPE = "image/jpeg";
const INITIAL_QUALITY = 0.9;
const MIN_QUALITY = 0.55;
const QUALITY_STEP = 0.07;
const INITIAL_MAX_LONGEST_SIDE = 1800;
const MIN_LONGEST_SIDE = 720;
const DIMENSION_STEP = 0.85;

const canvasToBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to convert image"));
        return;
      }
      resolve(blob);
    }, type, quality);
  });

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to load image"));
    };
    image.src = objectUrl;
  });

const buildJpegFileName = (name = "visit-image") => {
  const normalizedName = String(name)
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${normalizedName || "visit-image"}.jpg`;
};

export const formatFileSize = (bytes) => {
  const size = Number(bytes);
  if (!Number.isFinite(size) || size <= 0) return "0 KB";
  return `${(size / 1024).toFixed(size >= 100 * 1024 ? 0 : 1)} KB`;
};

export async function optimizeVisitImage(
  file,
  {
    targetMaxBytes = DEFAULT_TARGET_MAX_BYTES,
    outputMimeType = DEFAULT_OUTPUT_MIME_TYPE,
  } = {},
) {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Unable to prepare image");

  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  const originalLongestSide = Math.max(sourceWidth, sourceHeight);
  let currentLongestSide = Math.min(
    originalLongestSide,
    INITIAL_MAX_LONGEST_SIDE,
  );
  let smallestBlob = null;

  while (true) {
    const scale = currentLongestSide / originalLongestSide;
    const width = Math.max(1, Math.round(sourceWidth * scale));
    const height = Math.max(1, Math.round(sourceHeight * scale));

    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    for (
      let quality = INITIAL_QUALITY;
      quality >= MIN_QUALITY;
      quality -= QUALITY_STEP
    ) {
      const blob = await canvasToBlob(
        canvas,
        outputMimeType,
        Number(quality.toFixed(2)),
      );
      if (!smallestBlob || blob.size < smallestBlob.size) smallestBlob = blob;
      if (blob.size <= targetMaxBytes) {
        return new File([blob], buildJpegFileName(file.name), {
          type: outputMimeType,
          lastModified: Date.now(),
        });
      }
    }

    if (currentLongestSide <= MIN_LONGEST_SIDE) break;
    currentLongestSide = Math.max(
      MIN_LONGEST_SIDE,
      Math.round(currentLongestSide * DIMENSION_STEP),
    );
  }

  if (smallestBlob && smallestBlob.size <= 5 * 1024 * 1024) {
    return new File([smallestBlob], buildJpegFileName(file.name), {
      type: outputMimeType,
      lastModified: Date.now(),
    });
  }

  throw new Error("Unable to optimize image below the upload limit");
}
