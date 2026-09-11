import {
  DEFAULT_BOTTOM_TAB_SETTINGS,
  readBottomTabSettings,
  type BottomTabSettings,
} from '@/config/bottom-tab';

import { getCmsPage } from './cms';

const GLOBAL_SETTINGS_CONTENT_TYPE = 'appSettings';
const GLOBAL_SETTINGS_DOCUMENT_ID = 'app-settings';

export async function getBottomTabSettings(): Promise<BottomTabSettings> {
  const globalPage = await getCmsPage(
    GLOBAL_SETTINGS_CONTENT_TYPE,
    GLOBAL_SETTINGS_DOCUMENT_ID,
    { forceRefresh: true },
  ).catch(() => null);

  if (globalPage) return readBottomTabSettings(globalPage);

  // Permite validar a primeira versão usando uma seção BottomTabSettings
  // dentro do documento Home, antes de o tipo global ser publicado no CMS.
  const homePage = await getCmsPage('home', 'home', { forceRefresh: true }).catch(() => null);
  if (homePage) return readBottomTabSettings(homePage);

  return DEFAULT_BOTTOM_TAB_SETTINGS;
}
