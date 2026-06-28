/** Replace `{key}` placeholders in translated strings. */
export function formatMessage(template: string, vars: Record<string, string | number>): string {
  return Object.entries(vars).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, "g"), String(value)),
    template,
  );
}
