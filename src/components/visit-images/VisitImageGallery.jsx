import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CalendarDays, Expand, Images, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { getClinicProfileLabel } from "@/lib/clinicProfiles";
import { usePatientVisitImages } from "@/hooks/useVisitImages";
import { useProtectedPatientVisitImage } from "@/hooks/useProtectedImage";
import { VisitImagePreviewDialog } from "./VisitImagePreviewDialog";

function GalleryImage({ image, patientId }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [previewOpen, setPreviewOpen] = useState(false);
  const tileRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const imageQuery = useProtectedPatientVisitImage(patientId, image.id, {
    enabled: isVisible,
  });
  const session = image.session || {};

  useEffect(() => {
    const tile = tileRef.current;
    if (!tile || isVisible) return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(tile);
    return () => observer.disconnect();
  }, [isVisible]);

  return (
    <>
      <div ref={tileRef} className="overflow-hidden rounded-md border bg-card">
        <button
          type="button"
          className="group relative block aspect-[4/3] w-full bg-muted"
          onClick={() => setPreviewOpen(true)}
          disabled={!imageQuery.objectUrl}
          aria-label={t("visitImages.openPreview")}
        >
          {imageQuery.isLoading ? (
            <span className="flex h-full items-center justify-center">
              <LoadingSpinner />
            </span>
          ) : imageQuery.objectUrl ? (
            <img
              src={imageQuery.objectUrl}
              alt={t("visitImages.preview")}
              loading="lazy"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center px-3 text-sm text-muted-foreground">
              {t("visitImages.loadFailed")}
            </span>
          )}
          <span className="absolute bottom-1.5 end-1.5 rounded-full bg-black/65 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Expand className="h-3.5 w-3.5" />
          </span>
        </button>
        <div className="space-y-2 p-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <Badge variant="secondary">
              {getClinicProfileLabel(session.profile, t)}
            </Badge>
            <span className="text-muted-foreground">
              {session.status ? t(`status.${session.status}`) : "--"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5" />
            <span>
              {session.sessionDate ? formatDate(session.sessionDate, "PP") : "--"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Stethoscope className="h-3.5 w-3.5" />
            <span className="truncate">{session.doctor?.fullName || "--"}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-1 h-8 w-full text-xs"
            onClick={() => navigate(`/sessions/${session.id}`)}
          >
            {t("visitImages.openVisit")}
          </Button>
        </div>
      </div>
      <VisitImagePreviewDialog
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        imageUrl={imageQuery.objectUrl}
        title={t("visitImages.preview")}
      />
    </>
  );
}

export function VisitImageGallery({ patientId }) {
  const { t } = useTranslation();
  const [page, setPage] = useState(1);
  const query = usePatientVisitImages(patientId, page);
  const images = query.data?.data || [];
  const meta = query.data?.meta || { page: 1, totalPages: 1, total: 0 };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Images className="h-5 w-5" />
          {t("visitImages.galleryTitle")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {query.isLoading ? (
          <LoadingSpinner />
        ) : images.length ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
              {images.map((image) => (
                <GalleryImage key={image.id} image={image} patientId={patientId} />
              ))}
            </div>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <span>{t("visitImages.total", { count: meta.total || 0 })}</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || query.isFetching}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                >
                  {t("common.previous")}
                </Button>
                <span>
                  {meta.page || page} / {meta.totalPages || 1}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= (meta.totalPages || 1) || query.isFetching}
                  onClick={() => setPage((value) => value + 1)}
                >
                  {t("common.next")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("visitImages.emptyGallery")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
