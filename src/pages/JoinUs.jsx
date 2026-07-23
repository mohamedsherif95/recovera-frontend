import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  MessagesSquare,
  Send,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PublicAuthLayout } from "@/components/layout/PublicAuthLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateJoinRequest } from "@/hooks/useJoinRequests";
import { CLINIC_PROFILE_OPTIONS } from "@/lib/clinicProfiles";
import { cn } from "@/lib/utils";
import { joinUsSchema } from "@/lib/validators";

export default function JoinUsPage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.dir() === "rtl";
  const createJoinRequest = useCreateJoinRequest();
  const [submitted, setSubmitted] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(joinUsSchema),
    defaultValues: {
      name: "",
      phone: "",
      whatsappNumber: "",
      email: "",
      clinicType: "",
    },
  });

  const onSubmit = (values) => {
    createJoinRequest.mutate(values, {
      onSuccess: () => setSubmitted(true),
    });
  };

  return (
    <PublicAuthLayout className="items-start">
      <div className="grid w-full gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <section className="pt-2 lg:pt-10">
          <div className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm font-semibold text-primary shadow-sm">
            <MessagesSquare className="h-4 w-4" />
            {t("joinUs.eyebrow", { defaultValue: "New clinic access" })}
          </div>
          <h1 className="mt-5 max-w-xl text-3xl font-black leading-tight text-foreground sm:text-4xl">
            {t("joinUs.title", {
              defaultValue: "Tell us about your clinic and we will help you join Recovera.",
            })}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
            {t("joinUs.description", {
              defaultValue:
                "Share the best contact details for your team. Recovera will use this request to follow up about setup, clinic type, and access.",
            })}
          </p>
          <Button asChild variant="ghost" className="mt-6 px-0">
            <Link to="/">
              <ArrowLeft className={cn("h-4 w-4", isRtl && "rotate-180")} />
              {t("joinUs.backHome", { defaultValue: "Back to home" })}
            </Link>
          </Button>
        </section>

        <Card className="w-full border-primary/15 bg-card/95 shadow-2xl shadow-primary/10">
          {submitted ? (
            <CardContent className="flex min-h-[32rem] flex-col items-center justify-center px-6 py-12 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                <CheckCircle2 className="h-8 w-8" />
              </span>
              <h2 className="mt-6 text-2xl font-black">
                {t("joinUs.successTitle", { defaultValue: "Request received" })}
              </h2>
              <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
                {t("joinUs.successDescription", {
                  defaultValue: "Success. We'll be in touch soon.",
                })}
              </p>
              <Button asChild className="mt-8">
                <Link to="/">
                  {t("joinUs.backHome", { defaultValue: "Back to home" })}
                </Link>
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader>
                <CardTitle className="text-2xl font-bold">
                  {t("joinUs.formTitle", { defaultValue: "Join us" })}
                </CardTitle>
                <CardDescription>
                  {t("joinUs.formDescription", {
                    defaultValue: "A few details are enough to start the conversation.",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  <Field
                    id="join-name"
                    label={t("joinUs.fields.name", { defaultValue: "Name" })}
                    error={translateError(t, errors.name?.message)}
                  >
                    <Input
                      id="join-name"
                      autoComplete="name"
                      disabled={createJoinRequest.isPending}
                      {...register("name")}
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      id="join-phone"
                      label={t("joinUs.fields.phone", {
                        defaultValue: "Phone",
                      })}
                      error={translateError(t, errors.phone?.message)}
                    >
                      <Input
                        id="join-phone"
                        type="tel"
                        autoComplete="tel"
                        disabled={createJoinRequest.isPending}
                        {...register("phone")}
                      />
                    </Field>
                    <Field
                      id="join-whatsapp"
                      label={t("joinUs.fields.whatsapp", {
                        defaultValue: "WhatsApp number",
                      })}
                      error={translateError(t, errors.whatsappNumber?.message)}
                    >
                      <Input
                        id="join-whatsapp"
                        type="tel"
                        autoComplete="tel"
                        disabled={createJoinRequest.isPending}
                        {...register("whatsappNumber")}
                      />
                    </Field>
                  </div>

                  <Field
                    id="join-email"
                    label={t("joinUs.fields.email", {
                      defaultValue: "Email (optional)",
                    })}
                    error={translateError(t, errors.email?.message)}
                  >
                    <Input
                      id="join-email"
                      type="email"
                      autoComplete="email"
                      disabled={createJoinRequest.isPending}
                      {...register("email")}
                    />
                  </Field>

                  <div className="space-y-2">
                    <Label htmlFor="join-clinic-type">
                      {t("joinUs.fields.clinicType", {
                        defaultValue: "Clinic type",
                      })}
                    </Label>
                    <Controller
                      control={control}
                      name="clinicType"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={createJoinRequest.isPending}
                        >
                          <SelectTrigger id="join-clinic-type">
                            <SelectValue
                              placeholder={t("joinUs.fields.clinicPlaceholder", {
                                defaultValue: "Select clinic type",
                              })}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            {CLINIC_PROFILE_OPTIONS.map((option) => (
                              <SelectItem
                                key={option.value}
                                value={option.value}
                              >
                                {t(option.labelKey, {
                                  defaultValue: option.labelDefault,
                                })}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {errors.clinicType && (
                      <p className="text-sm text-destructive">
                        {translateError(t, errors.clinicType.message)}
                      </p>
                    )}
                  </div>

                  {createJoinRequest.isError && (
                    <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      {createJoinRequest.error?.response?.data?.message ||
                        t("joinUs.submitError", {
                          defaultValue:
                            "Could not submit your request. Please try again or chat with us directly.",
                        })}
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createJoinRequest.isPending}
                  >
                    {createJoinRequest.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {t("joinUs.submit", { defaultValue: "Submit request" })}
                  </Button>
                </form>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </PublicAuthLayout>
  );
}

function Field({ id, label, error, children }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function translateError(t, message) {
  if (!message) return "";
  return t(message, { defaultValue: message });
}
