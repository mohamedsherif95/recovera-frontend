const PROGRAM_TITLE_KEYS = [
  "name",
  "title",
  "program",
  "exercise",
  "note",
  "description",
];

const PROGRAM_METADATA_KEYS = new Set(["id", "createdAt", "updatedAt"]);

function isDisplayValue(value) {
  return (
    value != null &&
    value !== "" &&
    (typeof value !== "object" || Array.isArray(value))
  );
}

function formatFieldName(key) {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();

  return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)}` : key;
}

function formatFieldValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).join(", ");
  }
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }
  return String(value);
}

export function formatProgramItem(item) {
  if (item == null) return "";
  if (typeof item !== "object" || Array.isArray(item)) {
    return formatFieldValue(item).trim();
  }

  const titleKey = PROGRAM_TITLE_KEYS.find((key) =>
    isDisplayValue(item[key]),
  );
  const title = titleKey ? formatFieldValue(item[titleKey]).trim() : "";
  const details = Object.entries(item)
    .filter(
      ([key, value]) =>
        key !== titleKey &&
        !PROGRAM_METADATA_KEYS.has(key) &&
        isDisplayValue(value),
    )
    .map(
      ([key, value]) =>
        `${formatFieldName(key)}: ${formatFieldValue(value).trim()}`,
    )
    .filter((value) => !value.endsWith(": "));

  return [title, ...details].filter(Boolean).join("\n");
}

export function normalizeProgramItems(value) {
  const items = Array.isArray(value) ? value : [value];
  return items.map(formatProgramItem).filter((item) => item.length > 0);
}
