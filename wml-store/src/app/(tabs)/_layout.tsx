import AppTabs from '@/components/app-tabs';
import { TabBarContext } from '@/context/tab-bar-context';
import { useContext } from 'react';

export default function TabsLayout() {
  useContext(TabBarContext);
  return <AppTabs showBar={false} />;
}
