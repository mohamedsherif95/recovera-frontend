import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Expand, FileImage, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useAuthStore } from "@/store/authStore";
import { USER_ROLES } from "@/lib/constants";
import { useBranchAccessState } from "@/hooks/useBranchAccessState";
import {
  useRemoveVisitImage,
  useSessionVisitImages,
  useUploadVisitImage,
} from "@/hooks/useVisitImages";
import { useProtectedVisitImage } from "@/hooks/useProtectedImage";
import { VisitImagePreviewDialog } from "./VisitImagePreviewDialog";
import { VisitImageUpload } from "./VisitImageUpload";

const MAX_IMAGES = 10;
const getRoleName = (role) =>
  (typeof role === "string" ? role : role?.name || "").toLowerCase();

function VisitImageTile({ image, canManage, onDelete }) {
  const { t } = useTranslation();
  const [previewOpen, setPreviewOpen] = useState(false);
  const imageQuery = useProtectedVisitImage(image.sessionId, image.id);

  return (
    <>
      <div className="relative overflow-hidden rounded-md border bg-muted">
        <button
          type="button"
          className="group block aspect-[4/3] w-full"
          onClick={() => setPreviewOpen(true)}
          disabled={!imageQuery.objectUrl}
        >
          {imageQuery.isLoading ? (
            <span className="flex h-full items-center justify-center">
              <LoadingSpinner />
            </span>
          ) : imageQuery.objectUrl ? (
            <img
              src={imageQuery.objectUrl}
              alt={t("visitImages.preview")}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="flex h-full items-center justify-center px-3 text-sm text-muted-foreground">
              {t("visitImages.loadFailed")}
            </span>
          )}
          <span className="absolute bottom-1 end-1 rounded-full bg-black/65 p-1.5 text-white opacity-0 transition-opacity group-hover:opacity-100">
            <Expand className="h-3.5 w-3.5" />
          </span>
        </button>
        {canManage ? (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute end-1 top-1 h-7 w-7"
            onClick={() => onDelete(image)}
            aria-label={t("common.delete")}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
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

export function VisitImageCard({ session }) {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { isReadOnlyBranch, readOnlyTitleKey, readOnlyTitle } =
    useBranchAccessState();
  const [imageToDelete, setImageToDelete] = useState(null);
  const metadataQuery = useSessionVisitImages(session.id);
  const images = metadataQuery.data || [];
  const upload = useUploadVisitImage();
  const remove = useRemoveVisitImage();
  const roles = user?.roles?.map(getRoleName).filter(Boolean) || [];
  const currentUserId = user?.id ?? user?.userId;
  const isPlatformAdmin =
    user?.isPlatformAdmin || roles.includes(USER_ROLES.ADMIN);
  const isAssignedDoctor =
    roles.includes(USER_ROLES.DOCTOR) &&
    Number(session.doctorId ?? session.doctor?.id) === Number(currentUserId);
  const canManage =
    (isPlatformAdmin || !isReadOnlyBranch) &&
    (isPlatformAdmin ||
      roles.includes(USER_ROLES.MANAGER) ||
      roles.includes(USER_ROLES.BRANCH_MANAGER) ||
      roles.includes(USER_ROLES.SECRETARY) ||
      isAssignedDoctor);
  const remainingSlots = Math.max(0, MAX_IMAGES - images.length);
  const patientId = session.patientId ?? session.patient?.id;
  const readOnlyTooltip = t(readOnlyTitleKey, { defaultValue: readOnlyTitle });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <FileImage className="h-5 w-5" />
          {t("visitImages.title")}
        </CardTitle>
        <span className="text-sm text-muted-foreground">
          {t("visitImages.sessionCount", {
            count: images.length,
            max: MAX_IMAGES,
          })}
        </span>
      </CardHeader>
      <CardContent className="space-y-4">
        {metadataQuery.isLoading ? (
          <LoadingSpinner />
        ) : images.length ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {images.map((image) => (
              <VisitImageTile
                key={image.id}
                image={image}
                canManage={canManage}
                onDelete={setImageToDelete}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
            {t("visitImages.emptySession")}
          </div>
        )}

        {canManage && remainingSlots > 0 ? (
          <VisitImageUpload
            remainingSlots={remainingSlots}
            isUploading={upload.isPending}
            onUpload={(file) =>
              upload.mutateAsync({
                sessionId: session.id,
                patientId,
                file,
              })
            }
          />
        ) : canManage ? (
          <p className="text-sm text-muted-foreground">
            {t("visitImages.limitReached", { max: MAX_IMAGES })}
          </p>
        ) : isReadOnlyBranch && !isPlatformAdmin ? (
          <p className="text-sm text-muted-foreground" title={readOnlyTooltip}>
            {t("app.readOnlyDescription")}
          </p>
        ) : null}
      </CardContent>

      <ConfirmDialog
        open={Boolean(imageToDelete)}
        onOpenChange={(open) => {
          if (!open) setImageToDelete(null);
        }}
        title={t("visitImages.deleteTitle")}
        description={t("visitImages.deleteDescription")}
        isLoading={remove.isPending}
        onConfirm={() =>
          remove.mutate(
            {
              sessionId: session.id,
              imageId: imageToDelete?.id,
              patientId,
            },
            { onSuccess: () => setImageToDelete(null) },
          )
        }
      />
    </Card>
  );
}
