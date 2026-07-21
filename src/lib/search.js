export function normalizeSearchText(value) {
  if (value === null || value === undefined) return '';

  return String(value)
    .trim()
    .toLowerCase()
    // Remove Arabic diacritics and tatweel.
    .replace(/\u0640/g, '')
    .replace(/[\u064b-\u065f]/g, '')
    .replace(/\u0670/g, '')
    // Normalize Arabic letter variants.
    .replace(/[\u0623\u0625\u0622\u0671]/g, '\u0627')
    .replace(/\u0649/g, '\u064a')
    .replace(/\u0624/g, '\u0648')
    .replace(/\u0626/g, '\u064a')
    .replace(/\u0629/g, '\u0647')
    // Normalize Arabic-Indic and Extended Arabic-Indic digits.
    .replace(/[\u0660-\u0669]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0660),
    )
    .replace(/[\u06f0-\u06f9]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06f0),
    );
}

export function includesNormalizedText(haystack, needle) {
  const normalizedNeedle = normalizeSearchText(needle);
  if (!normalizedNeedle) return true;

  return normalizeSearchText(haystack).includes(normalizedNeedle);
}
