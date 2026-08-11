import { createContext, useContext } from 'react';

type TabBarContextValue = {
  hidden: boolean;
  setHidden: (hidden: boolean) => void;
};

export const TabBarContext = createContext<TabBarContextValue>({
  hidden: false,
  setHidden: () => undefined,
});

export function useTabBar() {
  return useContext(TabBarContext);
}
