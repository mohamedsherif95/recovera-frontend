import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  useSessionProfileDetails,
  useUpdateSessionProfileDetails,
} from "@/hooks/useSessions";
import { getProfileDetailFields } from "@/lib/sessionProfileDetails";

function unwrapResponse(response) {
  return response?.data ?? response ?? null;
}

function buildInitialDetails(fields, details) {
  return fields.reduce((acc, field) => {
    const value = details?.[field.key];
    acc[field.key] = value == null ? "" : String(value);
    return acc;
  }, {});
}

function cleanDetails(fields, values) {
  return fields.reduce((acc, field) => {
    const rawValue = values[field.key];
    if (rawValue == null || rawValue === "") {
      return acc;
    }

    if (field.type === "number") {
      const numericValue = Number(rawValue);
      if (Number.isFinite(numericValue)) {
        acc[field.key] = numericValue;
      }
      return acc;
    }

    const value = String(rawValue).trim();
    if (value) {
      acc[field.key] = value;
    }
    return acc;
  }, {});
}

export function ProfileDetailsPanel({ session, canEdit }) {
  const { t } = useTranslation();
  const sessionId = session?.id;
  const profile = session?.profile;
  const fields = useMemo(() => getProfileDetailFields(profile), [profile]);
  const [isEditing, setIsEditing] = useState(false);
  const [formValues, setFormValues] = useState({});

  const detailsQuery = useSessionProfileDetails(sessionId, {
    enabled: Boolean(sessionId && fields.length > 0),
  });
  const updateDetails = useUpdateSessionProfileDetails();
  const profileDetails = unwrapResponse(detailsQuery.data);
  const details = useMemo(
    () => profileDetails?.details || {},
    [profileDetails?.details],
  );
  const hasDetails = fields.some(
    (field) => details[field.key] != null && details[field.key] !== "",
  );

  useEffect(() => {
    if (!isEditing) {
      setFormValues(buildInitialDetails(fields, details));
    }
  }, [details, fields, isEditing]);

  if (!session || fields.length === 0) {
    return null;
  }

  const handleChange = (fieldKey, value) => {
    setFormValues((current) => ({
      ...current,
      [fieldKey]: value,
    }));
  };

  const handleStartEdit = () => {
    setFormValues(buildInitialDetails(fields, details));
    setIsEditing(true);
  };

  const handleSave = () => {
    updateDetails.mutate(
      {
        sessionId,
        data: {
          profile,
          details: cleanDetails(fields, formValues),
        },
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      },
    );
  };

  const title = t("visitDetails.title", {
    defaultValue: "Visit details",
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>{title}</CardTitle>
        {canEdit && (
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              isEditing ? setIsEditing(false) : handleStartEdit()
            }
            disabled={updateDetails.isPending}
          >
            {isEditing ? t("common.close") : t("common.edit")}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {detailsQuery.isLoading ? (
          <p className="text-sm text-muted-foreground">
            {t("messages.loadingData")}
          </p>
        ) : isEditing ? (
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <div
                  key={field.key}
                  className={
                    field.type === "textarea"
                      ? "space-y-2 md:col-span-2"
                      : "space-y-2"
                  }
                >
                  <Label htmlFor={`profile-detail-${field.key}`}>
                    {t(field.labelKey, { defaultValue: field.defaultLabel })}
                  </Label>
                  {field.type === "textarea" ? (
                    <Textarea
                      id={`profile-detail-${field.key}`}
                      rows={4}
                      value={formValues[field.key] || ""}
                      onChange={(event) =>
                        handleChange(field.key, event.target.value)
                      }
                      disabled={updateDetails.isPending}
                    />
                  ) : (
                    <Input
                      id={`profile-detail-${field.key}`}
                      type={field.type === "number" ? "number" : "text"}
                      min={field.type === "number" ? 1 : undefined}
                      value={formValues[field.key] || ""}
                      onChange={(event) =>
                        handleChange(field.key, event.target.value)
                      }
                      disabled={updateDetails.isPending}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                disabled={updateDetails.isPending}
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="button"
                onClick={handleSave}
                disabled={updateDetails.isPending}
              >
                {updateDetails.isPending
                  ? t("common.loading")
                  : t("common.save")}
              </Button>
            </div>
          </div>
        ) : hasDetails ? (
          <div className="grid gap-4 md:grid-cols-2">
            {fields
              .filter(
                (field) =>
                  details[field.key] != null && details[field.key] !== "",
              )
              .map((field) => (
                <div
                  key={field.key}
                  className={
                    field.type === "textarea"
                      ? "space-y-1 md:col-span-2"
                      : "space-y-1"
                  }
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {t(field.labelKey, { defaultValue: field.defaultLabel })}
                  </p>
                  <p className="whitespace-pre-line text-sm">
                    {String(details[field.key])}
                  </p>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("visitDetails.empty", {
              defaultValue: "No visit details recorded for this profile.",
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
