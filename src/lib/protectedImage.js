const getContentType = (response) =>
  response?.headers?.["content-type"] || response?.data?.type || "";

const createProtectedImageError = (response, payload) => {
  const status = Number(payload?.status) || response?.status || 500;
  const message = payload?.message || "Failed to load protected image";
  const error = new Error(message);
  error.config = response?.config;
  error.response = {
    ...response,
    status,
    data: payload,
  };
  return error;
};

export async function parseProtectedImageResponse(response) {
  const contentType = getContentType(response).toLowerCase();
  const blob = response?.data;

  if (blob instanceof Blob && contentType.startsWith("image/")) {
    return blob;
  }

  if (
    blob instanceof Blob &&
    (contentType.includes("json") || blob.type.includes("json"))
  ) {
    let payload;
    try {
      payload = JSON.parse(await blob.text());
    } catch {
      payload = {
        status: response?.status || 500,
        message: "Failed to read protected image response",
        data: null,
      };
    }
    throw createProtectedImageError(response, payload);
  }

  throw createProtectedImageError(response, {
    status: response?.status || 500,
    message: "The server returned an unsupported image response",
    data: null,
  });
}
