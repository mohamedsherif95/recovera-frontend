import { DateTime } from "luxon";
import { env } from "@/lib/env";

export const DEFAULT_BUSINESS_TIME_ZONE = "Africa/Cairo";
const DATE_ONLY_FORMAT = "yyyy-MM-dd";
const MONTH_INPUT_FORMAT = "yyyy-MM";
const DATETIME_LOCAL_FORMAT = "yyyy-MM-dd'T'HH:mm";
const OFFSET_PATTERN = /(?:Z|[+-]\d{2}:?\d{2})$/i;

export function getBusinessTimeZone() {
  return env.businessTimeZone || DEFAULT_BUSINESS_TIME_ZONE;
}

export function clinicNow() {
  return DateTime.now().setZone(getBusinessTimeZone());
}

export function getClinicTodayDateOnly() {
  return clinicNow().toFormat(DATE_ONLY_FORMAT);
}

export function getClinicCurrentMonthInput() {
  return clinicNow().toFormat(MONTH_INPUT_FORMAT);
}

export function getClinicCurrentBillingMonth() {
  return clinicNow().startOf("month").toFormat(DATE_ONLY_FORMAT);
}

export function getClinicNextMonthInput() {
  return clinicNow()
    .plus({ months: 1 })
    .startOf("month")
    .toFormat(MONTH_INPUT_FORMAT);
}

export function getClinicMonthStartDateOnly() {
  return clinicNow().startOf("month").toFormat(DATE_ONLY_FORMAT);
}

export function getClinicMonthEndDateOnly() {
  return clinicNow().endOf("month").toFormat(DATE_ONLY_FORMAT);
}

export function getClinicDateDaysAgo(days) {
  return clinicNow().minus({ days }).toFormat(DATE_ONLY_FORMAT);
}

export function addDaysToDateOnly(dateOnly, days) {
  const parsed = parseDateOnly(dateOnly);
  return parsed ? parsed.plus({ days }).toFormat(DATE_ONLY_FORMAT) : "";
}

export function parseDateOnly(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;

  const dateOnly = match[0];
  const parsed = DateTime.fromISO(dateOnly, { zone: getBusinessTimeZone() });
  if (!parsed.isValid || parsed.toFormat(DATE_ONLY_FORMAT) !== dateOnly) {
    return null;
  }

  return parsed.startOf("day");
}

export function dateOnlyToDate(value) {
  const parsed = parseDateOnly(value);
  if (!parsed) return null;
  return toDateFnsCompatibleDate(parsed);
}

export function toBusinessDateTime(value) {
  if (!value) return null;

  if (value instanceof Date) {
    const parsed = DateTime.fromJSDate(value);
    return parsed.isValid ? parsed.setZone(getBusinessTimeZone()) : null;
  }

  const raw = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return parseDateOnly(raw);
  }

  const parsed = OFFSET_PATTERN.test(raw)
    ? DateTime.fromISO(raw, { setZone: true }).setZone(getBusinessTimeZone())
    : DateTime.fromISO(raw, { zone: getBusinessTimeZone() });

  return parsed.isValid ? parsed : null;
}

export function toDateFnsCompatibleDate(value) {
  const parsed = DateTime.isDateTime(value) ? value : toBusinessDateTime(value);
  if (!parsed?.isValid) return null;

  return new Date(
    parsed.year,
    parsed.month - 1,
    parsed.day,
    parsed.hour,
    parsed.minute,
    parsed.second,
    parsed.millisecond,
  );
}

export function getClinicCurrentTimeString() {
  return clinicNow().toFormat("HH:mm:ss");
}

export function clinicDateTimeLocalNow() {
  return clinicNow().toFormat(DATETIME_LOCAL_FORMAT);
}

export function clinicDateTimeLocalToIso(value) {
  const parsed = DateTime.fromFormat(
    String(value || ""),
    DATETIME_LOCAL_FORMAT,
    {
      zone: getBusinessTimeZone(),
    },
  );

  return parsed.isValid ? parsed.toUTC().toISO() : null;
}

export function dateOnlyToUtcStartIso(value) {
  const parsed = parseDateOnly(value);
  return parsed ? parsed.startOf("day").toUTC().toISO() : null;
}

export function dateOnlyToUtcEndIso(value) {
  const parsed = parseDateOnly(value);
  return parsed ? parsed.endOf("day").toUTC().toISO() : null;
}
