import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  Loader2,
  Megaphone,
  Paintbrush,
  RefreshCcw,
  Save,
  Settings2,
  Sparkles,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/common/PageHeader";
import { LandingBanner } from "@/components/marketing/LandingBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  usePlatformLandingBanner,
  useUpdatePlatformLandingBanner,
} from "@/hooks/usePlatformAdmin";
import { normalizeLandingBanner } from "@/lib/landingBanner";
import { cn } from "@/lib/utils";

const variantOptions = [
  { value: "solid", label: "Solid" },
  { value: "soft", label: "Soft" },
  { value: "outline", label: "Outline" },
];

const densityOptions = [
  { value: "compact", label: "Compact" },
  { value: "comfortable", label: "Comfortable" },
  { value: "spacious", label: "Spacious" },
];

const directionOptions = [
  { value: "left", label: "Move left" },
  { value: "right", label: "Move right" },
];

const colorFields = [
  { key: "backgroundColor", label: "Background" },
  { key: "textColor", label: "Text" },
  { key: "accentColor", label: "CTA background" },
  { key: "accentTextColor", label: "CTA text" },
  { key: "borderColor", label: "Border" },
];

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const toFormState = (settings) => normalizeLandingBanner(settings);

export default function PlatformAdminLandingBannerPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const { data, isLoading, isError, isFetching, refetch } =
    usePlatformLandingBanner();
  const updateMutation = useUpdatePlatformLandingBanner();
  const [form, setForm] = useState(() => toFormState());
  const previewSettings = useMemo(() => normalizeLandingBanner(form), [form]);
  const saveBlocked = form.enabled && !String(form.message || "").trim();

  useEffect(() => {
    if (data) {
      setForm(toFormState(data));
    }
  }, [data]);

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (saveBlocked) return;

    updateMutation.mutate(
      {
        ...form,
        speedSeconds: Number(form.speedSeconds),
      },
      {
        onSuccess: (savedSettings) => {
          setForm(toFormState(savedSettings));
          toast.success(
            t("platformAdmin.landingBanner.saveSuccess", {
              defaultValue: "Landing banner saved.",
            }),
          );
        },
        onError: (error) => {
          toast.error(
            error?.response?.data?.message ||
              t("platformAdmin.landingBanner.saveError", {
                defaultValue: "Could not save landing banner.",
              }),
          );
        },
      },
    );
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title={t("platformAdmin.landingBanner.title", {
          defaultValue: "Landing banner",
        })}
        description={t("platformAdmin.landingBanner.description", {
          defaultValue:
            "Control the moving announcement shown on the public home page.",
        })}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCcw
                className={cn("h-4 w-4", isFetching && "animate-spin")}
              />
              {t("common.refresh")}
            </Button>
            <Button
              type="submit"
              form="landing-banner-form"
              disabled={saveBlocked || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {t("common.save")}
            </Button>
          </>
        }
      />

      {isLoading ? (
        <Card>
          <CardContent className="flex min-h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </CardContent>
        </Card>
      ) : isError ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
            <Megaphone className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {t("platformAdmin.landingBanner.loadError", {
                defaultValue: "Could not load landing banner settings.",
              })}
            </p>
            <Button type="button" variant="outline" onClick={() => refetch()}>
              <RefreshCcw className="h-4 w-4" />
              {t("common.refresh")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <form
          id="landing-banner-form"
          onSubmit={handleSubmit}
          className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,0.82fr)]"
        >
          <div className="space-y-6">
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Megaphone className="h-5 w-5 text-primary" />
                  {t("platformAdmin.landingBanner.contentTitle", {
                    defaultValue: "Message",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <label className="flex min-h-11 items-center gap-3 rounded-md border bg-muted/35 px-3 py-2">
                  <Checkbox
                    checked={form.enabled}
                    onCheckedChange={(checked) =>
                      updateField("enabled", Boolean(checked))
                    }
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">
                      {t("platformAdmin.landingBanner.enabled", {
                        defaultValue: "Show banner on the public home page",
                      })}
                    </span>
                    <span className="block text-xs leading-5 text-muted-foreground">
                      {t("platformAdmin.landingBanner.enabledHint", {
                        defaultValue:
                          "Turn this off to keep the draft saved without displaying it.",
                      })}
                    </span>
                  </span>
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Kicker" htmlFor="banner-kicker">
                    <Input
                      id="banner-kicker"
                      value={form.kicker}
                      maxLength={60}
                      onChange={(event) =>
                        updateField("kicker", event.target.value)
                      }
                    />
                  </Field>
                  <Field label="CTA label" htmlFor="banner-cta-label">
                    <Input
                      id="banner-cta-label"
                      value={form.ctaLabel}
                      maxLength={48}
                      onChange={(event) =>
                        updateField("ctaLabel", event.target.value)
                      }
                    />
                  </Field>
                </div>

                <Field label="Main message" htmlFor="banner-message">
                  <Textarea
                    id="banner-message"
                    value={form.message}
                    maxLength={240}
                    className="min-h-24"
                    onChange={(event) =>
                      updateField("message", event.target.value)
                    }
                  />
                  {saveBlocked && (
                    <p className="text-xs font-medium text-destructive">
                      {t("platformAdmin.landingBanner.messageRequired", {
                        defaultValue:
                          "Add a message before showing the banner.",
                      })}
                    </p>
                  )}
                </Field>

                <Field label="Supporting detail" htmlFor="banner-details">
                  <Input
                    id="banner-details"
                    value={form.details}
                    maxLength={180}
                    onChange={(event) =>
                      updateField("details", event.target.value)
                    }
                  />
                </Field>

                <Field label="CTA link" htmlFor="banner-cta-href">
                  <Input
                    id="banner-cta-href"
                    value={form.ctaHref}
                    maxLength={500}
                    onChange={(event) =>
                      updateField("ctaHref", event.target.value)
                    }
                  />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Settings2 className="h-5 w-5 text-primary" />
                  {t("platformAdmin.landingBanner.motionTitle", {
                    defaultValue: "Style and motion",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <SelectField
                    label="Variant"
                    value={form.variant}
                    options={variantOptions}
                    onChange={(value) => updateField("variant", value)}
                  />
                  <SelectField
                    label="Density"
                    value={form.density}
                    options={densityOptions}
                    onChange={(value) => updateField("density", value)}
                  />
                  <SelectField
                    label="Direction"
                    value={form.direction}
                    options={directionOptions}
                    onChange={(value) => updateField("direction", value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <Field label="Speed in seconds" htmlFor="banner-speed">
                    <Input
                      id="banner-speed"
                      type="number"
                      min="10"
                      max="90"
                      value={form.speedSeconds}
                      onChange={(event) =>
                        updateField("speedSeconds", Number(event.target.value))
                      }
                    />
                  </Field>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <ToggleField
                      label="Pause on hover"
                      checked={form.pauseOnHover}
                      onChange={(value) => updateField("pauseOnHover", value)}
                    />
                    <ToggleField
                      label="Show icon"
                      checked={form.showIcon}
                      onChange={(value) => updateField("showIcon", value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Paintbrush className="h-5 w-5 text-primary" />
                  {t("platformAdmin.landingBanner.colorsTitle", {
                    defaultValue: "Colors",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {colorFields.map((field) => (
                    <ColorField
                      key={field.key}
                      label={field.label}
                      value={form[field.key]}
                      onChange={(value) => updateField(field.key, value)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                    {t("platformAdmin.landingBanner.previewTitle", {
                      defaultValue: "Live preview",
                    })}
                  </CardTitle>
                  <Badge variant={form.enabled ? "default" : "secondary"}>
                    {form.enabled
                      ? t("platformAdmin.landingBanner.enabledBadge", {
                          defaultValue: "Visible",
                        })
                      : t("platformAdmin.landingBanner.hiddenBadge", {
                          defaultValue: "Hidden",
                        })}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="overflow-hidden rounded-lg border bg-background">
                  <LandingBanner
                    settings={previewSettings}
                    isRtl={isRtl}
                    preview
                  />
                </div>
                <div className="grid gap-3 text-sm text-muted-foreground">
                  <PreviewRow label="Variant" value={previewSettings.variant} />
                  <PreviewRow label="Density" value={previewSettings.density} />
                  <PreviewRow
                    label="Motion"
                    value={`${previewSettings.direction}, ${previewSettings.speedSeconds}s`}
                  />
                  {data?.updatedAt && (
                    <PreviewRow
                      label="Last saved"
                      value={new Date(data.updatedAt).toLocaleString()}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function ToggleField({ label, checked, onChange }) {
  return (
    <label className="flex min-h-10 items-center gap-3 rounded-md border px-3 py-2">
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => onChange(Boolean(value))}
      />
      <span className="text-sm font-medium">{label}</span>
    </label>
  );
}

function ColorField({ label, value, onChange }) {
  const colorInputValue = hexColorPattern.test(String(value || ""))
    ? value
    : "#000000";

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-2">
        <Input
          type="color"
          value={colorInputValue}
          aria-label={label}
          className="h-10 cursor-pointer p-1"
          onChange={(event) => onChange(event.target.value)}
        />
        <Input
          value={value}
          maxLength={7}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function PreviewRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t pt-3">
      <span>{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
