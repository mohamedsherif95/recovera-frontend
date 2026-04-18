export const PACKAGE_CATEGORY_NAMES = ['Package 6', 'Package 12'];
export const ASSESSMENT_CATEGORY_NAMES = ['assessment', '\u0643\u0634\u0641'];

const PACKAGE_CATEGORY_LOOKUP = new Set(
  PACKAGE_CATEGORY_NAMES.map((name) => name.toLowerCase()),
);
const ASSESSMENT_CATEGORY_LOOKUP = new Set(
  ASSESSMENT_CATEGORY_NAMES.map((name) => name.toLowerCase()),
);

export function isPackageCategoryName(name) {
  if (!name) return false;
  return PACKAGE_CATEGORY_LOOKUP.has(String(name).trim().toLowerCase());
}

export function isAssessmentCategoryName(name) {
  if (!name) return false;
  return ASSESSMENT_CATEGORY_LOOKUP.has(String(name).trim().toLowerCase());
}
