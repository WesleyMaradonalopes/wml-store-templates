import { Montserrat_300Light, Montserrat_400Regular, Montserrat_500Medium, Montserrat_600SemiBold, Montserrat_700Bold, useFonts } from '@expo-google-fonts/montserrat';
import * as SplashScreen from 'expo-splash-screen';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRouter } from 'expo-router';
import { Linking, Platform, useColorScheme } from 'react-native';
import { TabBarContext } from '@/context/tab-bar-context';
import { getAccountSession, getVtexUserToken } from '@/services/auth';
import { addNotificationResponseListener, configureNotificationPresentation, getLastNotificationResponse, initializeNotifications, type NotificationResponse } from '@/services/notifications';
import GlobalTabBar from '@/components/global-tab-bar';
import { useCallback, useEffect, useRef, useState } from 'react';

void SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const [hidden, setHidden] = useState(false);
  const [showOnCheckout, setShowOnCheckout] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    Montserrat_300Light,
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    void Promise.all([getAccountSession(), getVtexUserToken()]);
  }, []);

  if (!fontsLoaded && !fontError && Platform.OS !== 'web') return null;

  return (
    <TabBarContext.Provider value={{ hidden, setHidden, showOnCheckout, setShowOnCheckout }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <NotificationBootstrap />
        <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="search" options={{ headerShown: false }} />
        <Stack.Screen name="favorites" options={{ headerShown: false }} />
        <Stack.Screen name="account" options={{ headerShown: false }} />
        <Stack.Screen name="product/[productId]" options={{ headerShown: false }} />
        <Stack.Screen name="page/[slug]" options={{ headerShown: false }} />
        <Stack.Screen name="checkout" options={{ headerShown: false }} />
        <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
        <Stack.Screen name="coupons" options={{ headerShown: false }} />
        <Stack.Screen name="returns" options={{ headerShown: false }} />
        <Stack.Screen name="stores" options={{ headerShown: false }} />
        <Stack.Screen name="orders" options={{ headerShown: false }} />
        <Stack.Screen name="orders/[id]" options={{ headerShown: false }} />
        </Stack>
        <GlobalTabBar />
      </ThemeProvider>
    </TabBarContext.Provider>
  );
}

function getNotificationTarget(data: Record<string, unknown>) {
  for (const key of ['url', 'link', 'deepLink', 'route', 'path']) {
    const value = data[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }

  const slug = data.slug;
  return typeof slug === 'string' && slug.trim() ? `/page/${encodeURIComponent(slug.trim())}` : '';
}

function NotificationBootstrap() {
  const router = useRouter();
  const handledResponseIds = useRef(new Set<string>());
  const handleResponse = useCallback((response: NotificationResponse) => {
    const notificationId = response.notification.request.identifier;
    if (handledResponseIds.current.has(notificationId)) return;
    handledResponseIds.current.add(notificationId);

    const data = response.notification.request.content.data || {};
    const target = getNotificationTarget(data);
    if (!target) return;

    if (/^(https?:|lojahr:)/i.test(target)) {
      void Linking.openURL(target);
      return;
    }

    const route = target.startsWith('/') ? target : `/${target}`;
    router.push(route as never);
  }, [router]);

  useEffect(() => {
    configureNotificationPresentation();
    void initializeNotifications().catch((error) => {
      console.warn('[notifications] Falha ao inicializar notificações.', error);
    });

    const responseSubscription = addNotificationResponseListener(handleResponse);
    void getLastNotificationResponse()
      .then((response) => {
        if (response) handleResponse(response);
      })
      .catch((error) => {
        console.warn('[notifications] Falha ao ler a última notificação.', error);
      });

    return () => responseSubscription?.remove();
  }, [handleResponse]);

  return null;
}
