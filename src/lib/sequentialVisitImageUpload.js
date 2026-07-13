export async function uploadVisitImagesSequentially({
  files,
  upload,
  onProgress,
}) {
  const total = files.length;
  let completed = 0;

  for (const file of files) {
    try {
      await upload(file);
    } catch (error) {
      error.failedFile = file;
      error.completed = completed;
      throw error;
    }

    completed += 1;
    onProgress?.({ completed, total, file });
  }

  return { completed, total };
}
