import { KNOWLEDGE_SETTINGS_PATH } from "@growvisi/shared";

/** Settings → AI & replies tab */
export const INTELLIGENCE_SETTINGS_PATH = KNOWLEDGE_SETTINGS_PATH;

export const INTELLIGENCE_INDUSTRY_FRAGMENT = "#industry-setup";

export function intelligenceSettingsHref(fragment?: string): string {
  return fragment ? `${INTELLIGENCE_SETTINGS_PATH}${fragment}` : INTELLIGENCE_SETTINGS_PATH;
}
