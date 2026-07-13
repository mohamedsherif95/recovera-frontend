import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

export function VisitImagePreviewDialog({
  open,
  onOpenChange,
  imageUrl,
  title,
}) {
  const { t } = useTranslation();
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (open) {
      setRotation(0);
    }
  }, [open, imageUrl]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-5xl overflow-auto">
        <DialogHeader className="pe-10">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setRotation((current) => (current + 90) % 360)}
          >
            <RotateCw className="me-2 h-4 w-4" />
            {t("visitImages.rotate")}
          </Button>
        </div>
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="mx-auto max-h-[78vh] w-auto max-w-full rounded-md object-contain transition-transform"
            style={{ transform: `rotate(${rotation}deg)` }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
