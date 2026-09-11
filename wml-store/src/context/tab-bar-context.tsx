import { createContext, useContext } from 'react';

import { DEFAULT_BOTTOM_TAB_SETTINGS, type BottomTabSettings } from '@/config/bottom-tab';

type TabBarContextValue = {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
  showOnCheckout: boolean;
  setShowOnCheckout: (show: boolean) => void;
  bottomTabSettings: BottomTabSettings;
};

export const TabBarContext = createContext<TabBarContextValue>({
  hidden: false,
  setHidden: () => undefined,
  showOnCheckout: false,
  setShowOnCheckout: () => undefined,
  bottomTabSettings: DEFAULT_BOTTOM_TAB_SETTINGS,
});

export function useTabBar() {
  return useContext(TabBarContext);
}
