import { useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { useTabBar } from '@/context/tab-bar-context';

export function useTabBarScroll() {
  const { setHidden } = useTabBar();
  const lastY = useRef(0);
  return (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = event.nativeEvent.contentOffset.y;
    if (y <= 8) setHidden(false);
    else if (y > lastY.current + 4) setHidden(true);
    else if (y < lastY.current - 4) setHidden(false);
    lastY.current = y;
  };
}
