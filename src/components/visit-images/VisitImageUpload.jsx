import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatFileSize, optimizeVisitImage } from "@/lib/imageUpload";
import { uploadVisitImagesSequentially } from "@/lib/sequentialVisitImageUpload";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 5 * 1024 * 1024;

export function VisitImageUpload({ remainingSlots, isUploading, onUpload }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);
  const previewsRef = useRef([]);
  const [items, setItems] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");

  const revokeItems = useCallback((values) => {
    values.forEach((item) => URL.revokeObjectURL(item.previewUrl));
  }, []);

  const reset = useCallback(() => {
    revokeItems(previewsRef.current);
    previewsRef.current = [];
    setItems([]);
    setProgress(null);
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }, [revokeItems]);

  useEffect(() => () => revokeItems(previewsRef.current), [revokeItems]);

  const handleChange = async (event) => {
    const selected = Array.from(event.target.files || []);
    reset();
    if (!selected.length) return;

    if (selected.length > remainingSlots) {
      setError(t("visitImages.selectionLimit", { count: remainingSlots }));
      return;
    }
    if (selected.some((file) => !ACCEPTED_TYPES.includes(file.type))) {
      setError(t("visitImages.invalidType"));
      return;
    }
    if (selected.some((file) => file.size > MAX_INPUT_BYTES)) {
      setError(t("visitImages.tooLarge"));
      return;
    }

    setIsProcessing(true);
    const nextItems = [];
    try {
      for (let index = 0; index < selected.length; index += 1) {
        setProgress({
          phase: "optimizing",
          current: index + 1,
          total: selected.length,
        });
        const optimized = await optimizeVisitImage(selected[index]);
        nextItems.push({
          file: optimized,
          previewUrl: URL.createObjectURL(optimized),
        });
      }
      previewsRef.current = nextItems;
      setItems(nextItems);
      setProgress(null);
    } catch {
      revokeItems(nextItems);
      setProgress(null);
      setError(t("visitImages.optimizationFailed"));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpload = async () => {
    if (!items.length) return;
    setError("");

    try {
      await uploadVisitImagesSequentially({
        files: items.map((item) => item.file),
        upload: onUpload,
        onProgress: ({ completed, total }) =>
          setProgress({
            phase: "uploading",
            current: completed,
            total,
          }),
      });
      toast.success(t("visitImages.uploadSuccess", { count: items.length }));
      reset();
    } catch (uploadError) {
      const completed = uploadError.completed || 0;
      const successfulItems = items.slice(0, completed);
      const remainingItems = items.slice(completed);
      revokeItems(successfulItems);
      previewsRef.current = remainingItems;
      setItems(remainingItems);
      setProgress(null);
      setError(
        t("visitImages.uploadFailed", {
          file: uploadError.failedFile?.name || "",
        }),
      );
    }
  };

  const statusText =
    progress?.phase === "optimizing"
      ? t("visitImages.optimizing", progress)
      : progress?.phase === "uploading"
        ? t("visitImages.uploading", progress)
        : t("visitImages.uploadHint", { count: remainingSlots });

  return (
    <div className="space-y-3 rounded-md border border-dashed p-3">
      <Input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        disabled={remainingSlots <= 0 || isUploading || isProcessing}
        className="h-auto cursor-pointer py-2"
      />
      {items.length ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {items.map((item) => (
            <div
              key={`${item.file.name}-${item.file.lastModified}`}
              className="min-w-0 rounded-md border p-2"
            >
              <img
                src={item.previewUrl}
                alt={t("visitImages.preview")}
                className="h-24 w-full rounded object-cover"
              />
              <div className="mt-1 truncate text-xs">{item.file.name}</div>
              <div className="text-xs text-muted-foreground">
                {formatFileSize(item.file.size)}
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">{statusText}</p>
        <Button
          type="button"
          size="sm"
          onClick={handleUpload}
          disabled={
            !items.length || isUploading || isProcessing || Boolean(progress)
          }
        >
          <Upload className="me-2 h-4 w-4" />
          {t("visitImages.uploadSelected", { count: items.length })}
        </Button>
      </div>
    </div>
  );
}
