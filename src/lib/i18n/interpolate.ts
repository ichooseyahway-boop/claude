/**
 * Minimal `{name}` interpolation for translated strings.
 *
 * PRD ref: FR-I18N-001 — "Use translation keys, not duplicated hard-coded UI
 * strings." Values are substituted at render time so that configurable brand
 * values never get baked into a catalog.
 *
 * Unknown placeholders are left intact rather than replaced with "undefined",
 * which makes a missing value obvious in review instead of silently shipping
 * broken copy.
 */
export function interpolate(
  template: string,
  values: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}
