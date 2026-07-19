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
import {
  getLandingBannerLanguage,
  normalizeLandingBanner,
  resolveLandingBannerContent,
} from "@/lib/landingBanner";
import { cn } from "@/lib/utils";

const variantOptions = [
  {
    value: "solid",
    labelKey: "platformAdmin.landingBanner.options.variant.solid",
    defaultLabel: "Solid",
  },
  {
    value: "soft",
    labelKey: "platformAdmin.landingBanner.options.variant.soft",
    defaultLabel: "Soft",
  },
  {
    value: "outline",
    labelKey: "platformAdmin.landingBanner.options.variant.outline",
    defaultLabel: "Outline",
  },
];

const densityOptions = [
  {
    value: "compact",
    labelKey: "platformAdmin.landingBanner.options.density.compact",
    defaultLabel: "Compact",
  },
  {
    value: "comfortable",
    labelKey: "platformAdmin.landingBanner.options.density.comfortable",
    defaultLabel: "Comfortable",
  },
  {
    value: "spacious",
    labelKey: "platformAdmin.landingBanner.options.density.spacious",
    defaultLabel: "Spacious",
  },
];

const directionOptions = [
  {
    value: "left",
    labelKey: "platformAdmin.landingBanner.options.direction.left",
    defaultLabel: "Move left",
  },
  {
    value: "right",
    labelKey: "platformAdmin.landingBanner.options.direction.right",
    defaultLabel: "Move right",
  },
];

const colorFields = [
  {
    key: "backgroundColor",
    labelKey: "platformAdmin.landingBanner.fields.backgroundColor",
    defaultLabel: "Background",
  },
  {
    key: "textColor",
    labelKey: "platformAdmin.landingBanner.fields.textColor",
    defaultLabel: "Text",
  },
  {
    key: "accentColor",
    labelKey: "platformAdmin.landingBanner.fields.accentColor",
    defaultLabel: "CTA background",
  },
  {
    key: "accentTextColor",
    labelKey: "platformAdmin.landingBanner.fields.accentTextColor",
    defaultLabel: "CTA text",
  },
  {
    key: "borderColor",
    labelKey: "platformAdmin.landingBanner.fields.borderColor",
    defaultLabel: "Border",
  },
];

const languagePanels = [
  {
    language: "ar",
    titleKey: "platformAdmin.landingBanner.languages.ar",
    defaultTitle: "Arabic",
    dir: "rtl",
  },
  {
    language: "en",
    titleKey: "platformAdmin.landingBanner.languages.en",
    defaultTitle: "English",
    dir: "ltr",
  },
];

const localizedContentFields = [
  {
    key: "kicker",
    labelKey: "platformAdmin.landingBanner.fields.kicker",
    defaultLabel: "Kicker",
    maxLength: 60,
    control: "input",
  },
  {
    key: "message",
    labelKey: "platformAdmin.landingBanner.fields.message",
    defaultLabel: "Main message",
    maxLength: 240,
    control: "textarea",
  },
  {
    key: "details",
    labelKey: "platformAdmin.landingBanner.fields.details",
    defaultLabel: "Supporting detail",
    maxLength: 180,
    control: "input",
  },
  {
    key: "ctaLabel",
    labelKey: "platformAdmin.landingBanner.fields.ctaLabel",
    defaultLabel: "CTA label",
    maxLength: 48,
    control: "input",
  },
  {
    key: "ctaHref",
    labelKey: "platformAdmin.landingBanner.fields.ctaHref",
    defaultLabel: "CTA link",
    maxLength: 500,
    control: "input",
  },
];

const hexColorPattern = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const toFormState = (settings) => normalizeLandingBanner(settings);

const hasText = (value) => String(value || "").trim().length > 0;

const hasRequiredLocalizedText = (localizedValue) =>
  languagePanels.every(({ language }) => hasText(localizedValue?.[language]));

export default function PlatformAdminLandingBannerPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const { data, isLoading, isError, isFetching, refetch } =
    usePlatformLandingBanner();
  const updateMutation = useUpdatePlatformLandingBanner();
  const [form, setForm] = useState(() => toFormState());
  const previewSettings = useMemo(() => normalizeLandingBanner(form), [form]);
  const previewContent = useMemo(
    () => resolveLandingBannerContent(previewSettings, i18n.language),
    [i18n.language, previewSettings],
  );
  const activePreviewLanguage = getLandingBannerLanguage(i18n.language);
  const saveBlocked = form.enabled && !hasRequiredLocalizedText(form.message);

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

  const updateLocalizedField = (field, language, value) => {
    setForm((current) => ({
      ...current,
      [field]: {
        ...(current[field] || {}),
        [language]: value,
      },
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

                <div className="grid gap-4 xl:grid-cols-2">
                  {languagePanels.map((panel) => (
                    <LocalizedContentPanel
                      key={panel.language}
                      panel={panel}
                      form={form}
                      t={t}
                      onChange={updateLocalizedField}
                    />
                  ))}
                </div>

                {saveBlocked && (
                  <p className="text-xs font-medium text-destructive">
                    {t("platformAdmin.landingBanner.messageRequired", {
                      defaultValue:
                        "Add Arabic and English messages before showing the banner.",
                    })}
                  </p>
                )}
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
                    label={t("platformAdmin.landingBanner.fields.variant", {
                      defaultValue: "Variant",
                    })}
                    value={form.variant}
                    options={variantOptions}
                    t={t}
                    onChange={(value) => updateField("variant", value)}
                  />
                  <SelectField
                    label={t("platformAdmin.landingBanner.fields.density", {
                      defaultValue: "Density",
                    })}
                    value={form.density}
                    options={densityOptions}
                    t={t}
                    onChange={(value) => updateField("density", value)}
                  />
                  <SelectField
                    label={t("platformAdmin.landingBanner.fields.direction", {
                      defaultValue: "Direction",
                    })}
                    value={form.direction}
                    options={directionOptions}
                    t={t}
                    onChange={(value) => updateField("direction", value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <Field
                    label={t(
                      "platformAdmin.landingBanner.fields.speedSeconds",
                      {
                        defaultValue: "Speed in seconds",
                      },
                    )}
                    htmlFor="banner-speed"
                  >
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
                      label={t(
                        "platformAdmin.landingBanner.fields.pauseOnHover",
                        { defaultValue: "Pause on hover" },
                      )}
                      checked={form.pauseOnHover}
                      onChange={(value) => updateField("pauseOnHover", value)}
                    />
                    <ToggleField
                      label={t("platformAdmin.landingBanner.fields.showIcon", {
                        defaultValue: "Show icon",
                      })}
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
                      label={t(field.labelKey, {
                        defaultValue: field.defaultLabel,
                      })}
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
                    language={i18n.language}
                    preview
                  />
                </div>
                <div className="grid gap-3 text-sm text-muted-foreground">
                  <PreviewRow
                    label={t("platformAdmin.landingBanner.preview.language", {
                      defaultValue: "Language",
                    })}
                    value={
                      activePreviewLanguage === "ar"
                        ? t("platformAdmin.landingBanner.languages.ar", {
                            defaultValue: "Arabic",
                          })
                        : t("platformAdmin.landingBanner.languages.en", {
                            defaultValue: "English",
                          })
                    }
                  />
                  <PreviewRow
                    label={t("platformAdmin.landingBanner.preview.message", {
                      defaultValue: "Message",
                    })}
                    value={previewContent.message || "--"}
                  />
                  <PreviewRow
                    label={t("platformAdmin.landingBanner.preview.variant", {
                      defaultValue: "Variant",
                    })}
                    value={previewSettings.variant}
                  />
                  <PreviewRow
                    label={t("platformAdmin.landingBanner.preview.density", {
                      defaultValue: "Density",
                    })}
                    value={previewSettings.density}
                  />
                  <PreviewRow
                    label={t("platformAdmin.landingBanner.preview.motion", {
                      defaultValue: "Motion",
                    })}
                    value={`${previewSettings.direction}, ${previewSettings.speedSeconds}s`}
                  />
                  {data?.updatedAt && (
                    <PreviewRow
                      label={t(
                        "platformAdmin.landingBanner.preview.lastSaved",
                        {
                          defaultValue: "Last saved",
                        },
                      )}
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

function LocalizedContentPanel({ panel, form, t, onChange }) {
  return (
    <div className="rounded-md border bg-muted/20 p-4" dir={panel.dir}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">
          {t(panel.titleKey, { defaultValue: panel.defaultTitle })}
        </h3>
        <Badge variant="outline">{panel.language.toUpperCase()}</Badge>
      </div>
      <div className="space-y-4">
        {localizedContentFields.map((field) => {
          const id = `banner-${field.key}-${panel.language}`;
          const value = form[field.key]?.[panel.language] || "";
          const inputDir = field.key === "ctaHref" ? "ltr" : panel.dir;

          return (
            <Field
              key={field.key}
              label={t(field.labelKey, { defaultValue: field.defaultLabel })}
              htmlFor={id}
            >
              {field.control === "textarea" ? (
                <Textarea
                  id={id}
                  value={value}
                  maxLength={field.maxLength}
                  className="min-h-24"
                  dir={inputDir}
                  onChange={(event) =>
                    onChange(field.key, panel.language, event.target.value)
                  }
                />
              ) : (
                <Input
                  id={id}
                  value={value}
                  maxLength={field.maxLength}
                  dir={inputDir}
                  onChange={(event) =>
                    onChange(field.key, panel.language, event.target.value)
                  }
                />
              )}
            </Field>
          );
        })}
      </div>
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

function SelectField({ label, value, options, t, onChange }) {
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
              {t(option.labelKey, { defaultValue: option.defaultLabel })}
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
