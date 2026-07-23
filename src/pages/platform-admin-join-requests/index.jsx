import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  RefreshCcw,
  UserPlus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageHeader } from "@/components/common/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  useMarkAllJoinRequestsReviewed,
  useMarkJoinRequestReviewed,
  usePlatformJoinRequests,
  usePlatformJoinRequestSummary,
} from "@/hooks/useJoinRequests";
import {
  CLINIC_PROFILE_OPTIONS,
  getClinicProfileLabel,
} from "@/lib/clinicProfiles";
import { cn, formatDateTime } from "@/lib/utils";

const filters = [
  { value: "new", label: "New" },
  { value: "all", label: "All" },
  { value: "reviewed", label: "Reviewed" },
];

export default function PlatformAdminJoinRequestsPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState("new");
  const {
    data: requests = [],
    isLoading,
    isError,
    isFetching,
    refetch,
  } = usePlatformJoinRequests({ status });
  const { data: summary } = usePlatformJoinRequestSummary();
  const markReviewed = useMarkJoinRequestReviewed();
  const markAllReviewed = useMarkAllJoinRequestsReviewed();
  const newCount = Number(summary?.newCount || 0);

  const clinicTypeOptions = useMemo(
    () =>
      CLINIC_PROFILE_OPTIONS.reduce((labels, option) => {
        labels[option.value] = t(option.labelKey, {
          defaultValue: option.labelDefault,
        });
        return labels;
      }, {}),
    [t],
  );

  const handleMarkReviewed = (request) => {
    markReviewed.mutate(request.id, {
      onSuccess: () => {
        toast.success(
          t("platformAdmin.joinRequests.reviewedToast", {
            defaultValue: "Join request marked as reviewed.",
          }),
        );
      },
    });
  };

  const handleMarkAllReviewed = () => {
    markAllReviewed.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(
          t("platformAdmin.joinRequests.reviewedAllToast", {
            count: Number(result?.updatedCount || 0),
            defaultValue: "{{count}} join requests marked as reviewed.",
          }),
        );
      },
    });
  };

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <PageHeader
        title={t("platformAdmin.joinRequests.title", {
          defaultValue: "Join requests",
        })}
        description={t("platformAdmin.joinRequests.description", {
          defaultValue:
            "Review public clinic access requests submitted from the join-us page.",
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
              type="button"
              onClick={handleMarkAllReviewed}
              disabled={newCount === 0 || markAllReviewed.isPending}
            >
              {markAllReviewed.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {t("platformAdmin.joinRequests.markAllReviewed", {
                defaultValue: "Mark all reviewed",
              })}
            </Button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label={t("platformAdmin.joinRequests.metrics.new", {
            defaultValue: "New requests",
          })}
          value={newCount}
          tone={newCount > 0 ? "attention" : "neutral"}
        />
        <MetricCard
          label={t("platformAdmin.joinRequests.metrics.total", {
            defaultValue: "Total requests",
          })}
          value={Number(summary?.totalCount || 0)}
        />
        <MetricCard
          label={t("platformAdmin.joinRequests.metrics.reviewed", {
            defaultValue: "Reviewed",
          })}
          value={Number(summary?.reviewedCount || 0)}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-3 pb-3 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" />
            {t("platformAdmin.joinRequests.inbox", {
              defaultValue: "Request inbox",
            })}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <Button
                key={filter.value}
                type="button"
                variant={status === filter.value ? "default" : "outline"}
                size="sm"
                onClick={() => setStatus(filter.value)}
              >
                {t(`platformAdmin.joinRequests.filters.${filter.value}`, {
                  defaultValue: filter.label,
                })}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex min-h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-sm text-muted-foreground">
              <UserPlus className="h-8 w-8" />
              {t("platformAdmin.joinRequests.loadError", {
                defaultValue: "Could not load join requests.",
              })}
              <Button type="button" variant="outline" onClick={() => refetch()}>
                <RefreshCcw className="h-4 w-4" />
                {t("common.refresh")}
              </Button>
            </div>
          ) : requests.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-2 text-center">
              <UserPlus className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {t("platformAdmin.joinRequests.empty", {
                  defaultValue: "No join requests match this filter.",
                })}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs font-semibold uppercase text-muted-foreground">
                    <th className="px-3 py-3">
                      {t("platformAdmin.joinRequests.table.name", {
                        defaultValue: "Name",
                      })}
                    </th>
                    <th className="px-3 py-3">
                      {t("platformAdmin.joinRequests.table.clinicType", {
                        defaultValue: "Clinic type",
                      })}
                    </th>
                    <th className="px-3 py-3">
                      {t("platformAdmin.joinRequests.table.contacts", {
                        defaultValue: "Contacts",
                      })}
                    </th>
                    <th className="px-3 py-3">
                      {t("platformAdmin.joinRequests.table.status", {
                        defaultValue: "Status",
                      })}
                    </th>
                    <th className="px-3 py-3">
                      {t("platformAdmin.joinRequests.table.createdAt", {
                        defaultValue: "Created",
                      })}
                    </th>
                    <th className="px-3 py-3 text-right">
                      {t("common.actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request.id} className="border-b last:border-0">
                      <td className="px-3 py-4 align-top">
                        <p className="font-semibold text-foreground">
                          {request.name}
                        </p>
                        {request.email && (
                          <a
                            href={`mailto:${request.email}`}
                            className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {request.email}
                          </a>
                        )}
                      </td>
                      <td className="px-3 py-4 align-top">
                        <Badge variant="info">
                          {clinicTypeOptions[request.clinicType] ||
                            getClinicProfileLabel(request.clinicType, t)}
                        </Badge>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <div className="grid gap-1.5">
                          <a
                            href={`tel:${request.phone}`}
                            className="inline-flex w-fit items-center gap-1.5 text-sm hover:text-primary"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {request.phone}
                          </a>
                          <a
                            href={toWhatsAppHref(request.whatsappNumber)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex w-fit items-center gap-1.5 text-sm hover:text-primary"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                            {request.whatsappNumber}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      </td>
                      <td className="px-3 py-4 align-top">
                        <Badge
                          variant={
                            request.status === "new" ? "warning" : "success"
                          }
                        >
                          {request.status === "new"
                            ? t("platformAdmin.joinRequests.status.new", {
                                defaultValue: "New",
                              })
                            : t("platformAdmin.joinRequests.status.reviewed", {
                                defaultValue: "Reviewed",
                              })}
                        </Badge>
                      </td>
                      <td className="px-3 py-4 align-top text-muted-foreground">
                        {formatDateTime(request.createdAt, "MMM d, yyyy p") ||
                          "--"}
                      </td>
                      <td className="px-3 py-4 text-right align-top">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={
                            request.status !== "new" ||
                            markReviewed.isPending
                          }
                          onClick={() => handleMarkReviewed(request)}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {t("platformAdmin.joinRequests.markReviewed", {
                            defaultValue: "Mark reviewed",
                          })}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, tone = "neutral" }) {
  return (
    <Card
      className={cn(
        tone === "attention" &&
          "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20",
      )}
    >
      <CardContent className="p-4">
        <p className="text-xs font-semibold uppercase text-muted-foreground">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold tracking-normal">{value}</p>
      </CardContent>
    </Card>
  );
}

function toWhatsAppHref(value) {
  const normalized = String(value || "").replace(/[^\d]/g, "");
  return `https://wa.me/${normalized}`;
}
