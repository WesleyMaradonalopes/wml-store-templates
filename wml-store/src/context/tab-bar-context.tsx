import { createContext, useContext } from 'react';

type TabBarContextValue = {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
  showOnCheckout: boolean;
  setShowOnCheckout: (show: boolean) => void;
};

export const TabBarContext = createContext<TabBarContextValue>({
  hidden: false,
  setHidden: () => undefined,
  showOnCheckout: false,
  setShowOnCheckout: () => undefined,
});

export function useTabBar() {
  return useContext(TabBarContext);
}
