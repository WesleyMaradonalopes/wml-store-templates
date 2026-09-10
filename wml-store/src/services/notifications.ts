import { isRunningInExpoGo } from 'expo';
import type * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { getStoredJson, setStoredJson } from './storage';

export const NOTIFICATION_TOPIC = 'lojahr_promotions';
export const NOTIFICATION_CHANNEL_ID = 'marketing';

const NOTIFICATIONS_PREFERENCE_KEY = 'lojahr:notifications-enabled';
const nativePlatform = Platform.OS === 'android' || Platform.OS === 'ios';

let presentationConfigured = false;
let channelRequest: Promise<void> | null = null;
let notificationOperation: Promise<unknown> = Promise.resolve();
let initializationPromise: Promise<NotificationState> | null = null;
let nativeRegistrationReady = false;
let notificationsModule: NotificationsModule | null | undefined;

type NotificationsModule = typeof import('expo-notifications');

export type NotificationResponse = Notifications.NotificationResponse;

type NotificationResponseSubscription = {
  remove: () => void;
};

export type NotificationState = {
  enabled: boolean;
  permissionGranted: boolean;
  permissionStatus: string;
  preference: boolean | null;
};

export class NotificationPermissionError extends Error {
  constructor() {
    super('A permissão de notificações não foi concedida.');
    this.name = 'NotificationPermissionError';
  }
}

export class NotificationModuleUnavailableError extends Error {
  constructor() {
    super('As notificações exigem um development build com o módulo nativo instalado.');
    this.name = 'NotificationModuleUnavailableError';
  }
}

/**
 * Expo Go and an old native binary can contain the JavaScript package without
 * containing its native module. Keep the import lazy so the rest of the app
 * can still open in those runtimes; push registration remains available in a
 * development/release build generated after installing this dependency.
 */
function getNotificationsModule(): NotificationsModule | null {
  // Expo Go intentionally does not include remote push notifications from
  // SDK 53 onward. Avoid importing expo-notifications there because its
  // native module lookup is reported as an uncaught Metro error.
  if (!nativePlatform || isRunningInExpoGo()) return null;
  if (notificationsModule !== undefined) return notificationsModule;

  try {
    notificationsModule = require('expo-notifications') as NotificationsModule;
  } catch {
    notificationsModule = null;
  }

  return notificationsModule;
}

/**
 * Makes remote notifications visible while the app is in the foreground.
 * This is a process-wide Expo Notifications setting, so it is configured once
 * from the root layout.
 */
export function configureNotificationPresentation() {
  if (!nativePlatform || presentationConfigured) return;

  const notifications = getNotificationsModule();
  if (!notifications) return;

  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  presentationConfigured = true;
}

async function readNotificationsPreference(): Promise<boolean | null> {
  try {
    const value = await getStoredJson<boolean>(NOTIFICATIONS_PREFERENCE_KEY);
    return typeof value === 'boolean' ? value : null;
  } catch {
    return null;
  }
}

async function writeNotificationsPreference(enabled: boolean) {
  await setStoredJson(NOTIFICATIONS_PREFERENCE_KEY, enabled);
}

async function ensureAndroidNotificationChannel() {
  if (Platform.OS !== 'android') return;
  const notifications = getNotificationsModule();
  if (!notifications) return;

  if (!channelRequest) {
    channelRequest = notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'Promoções e avisos',
      importance: notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#0a0a0a',
    }).then(() => undefined);
  }
  await channelRequest;
}

async function readNativePermission() {
  const notifications = getNotificationsModule();
  if (!notifications) return { granted: false, status: 'unavailable' };
  return notifications.getPermissionsAsync();
}

async function readState(): Promise<NotificationState> {
  if (!nativePlatform) {
    return {
      enabled: false,
      permissionGranted: false,
      permissionStatus: 'unsupported',
      preference: null,
    };
  }

  const [permission, preference] = await Promise.all([
    readNativePermission(),
    readNotificationsPreference(),
  ]);

  return {
    enabled: permission.granted && preference !== false && nativeRegistrationReady,
    permissionGranted: permission.granted,
    permissionStatus: permission.status,
    preference,
  };
}

/**
 * Reads the same effective state used by the account switch. A missing local
 * preference means opt-in when the operating system permission is granted,
 * matching the legacy Eitri behavior.
 */
export function getNotificationState() {
  return readState();
}

async function registerNativePush() {
  const notifications = getNotificationsModule();
  if (!notifications) throw new NotificationModuleUnavailableError();

  await ensureAndroidNotificationChannel();

  const token = await notifications.getDevicePushTokenAsync();
  if (!token.data) {
    throw new Error('O serviço de notificações não retornou um token para este dispositivo.');
  }

  // expo-notifications exposes topic subscriptions on Android. Sending the
  // Firebase campaign to this topic is what makes the account switch an
  // actual opt-in/opt-out instead of a visual-only preference.
  if (Platform.OS === 'android') {
    await notifications.subscribeToTopicAsync(NOTIFICATION_TOPIC);
  }

  nativeRegistrationReady = true;
}

function runNotificationOperation<T>(operation: () => Promise<T>): Promise<T> {
  const nextOperation = notificationOperation.then(operation, operation);
  notificationOperation = nextOperation.then(() => undefined, () => undefined);
  return nextOperation;
}

async function enableNotificationsInternal() {
  const notifications = getNotificationsModule();
  if (!notifications) throw new NotificationModuleUnavailableError();

  configureNotificationPresentation();
  await ensureAndroidNotificationChannel();

  let permission = await readNativePermission();
  if (!permission.granted) {
    permission = await notifications.requestPermissionsAsync();
  }

  if (!permission.granted) {
    nativeRegistrationReady = false;
    await writeNotificationsPreference(false);
    throw new NotificationPermissionError();
  }

  nativeRegistrationReady = false;
  await registerNativePush();
  await writeNotificationsPreference(true);
  return readState();
}

export function enableNotifications() {
  if (!nativePlatform) return Promise.resolve(readState());
  return runNotificationOperation(enableNotificationsInternal);
}

async function disableNotificationsInternal() {
  configureNotificationPresentation();
  nativeRegistrationReady = false;
  const notifications = getNotificationsModule();

  // Unsubscribe before deleting the native registration. Both calls are
  // best-effort because an older installation may not have a token/topic yet.
  if (notifications && Platform.OS === 'android') {
    await notifications.unsubscribeFromTopicAsync(NOTIFICATION_TOPIC).catch(() => undefined);
  }
  if (notifications) {
    await notifications.unregisterForNotificationsAsync().catch(() => undefined);
  }
  await writeNotificationsPreference(false);
  return readState();
}

export function disableNotifications() {
  if (!nativePlatform) return Promise.resolve(readState());
  return runNotificationOperation(disableNotificationsInternal);
}

/**
 * Initializes already-authorized installations and asks for permission on the
 * first launch, as the old Eitri home app did. An explicit opt-out is never
 * prompted again automatically; the user can opt back in from the switch.
 */
export function initializeNotifications() {
  if (!nativePlatform) return Promise.resolve(readState());

  if (initializationPromise) return initializationPromise;

  const promise = runNotificationOperation(async () => {
    configureNotificationPresentation();
    await ensureAndroidNotificationChannel();

    const preference = await readNotificationsPreference();
    let permission = await readNativePermission();

    if (!permission.granted && preference !== false && permission.status === 'undetermined') {
      const notifications = getNotificationsModule();
      if (notifications) permission = await notifications.requestPermissionsAsync();
    }

    if (permission.granted && preference !== false) {
      try {
        nativeRegistrationReady = false;
        await registerNativePush();
        await writeNotificationsPreference(true);
      } catch {
        nativeRegistrationReady = false;
        console.warn('[notifications] Não foi possível registrar o dispositivo.');
      }
    } else {
      nativeRegistrationReady = false;
    }

    return readState();
  });

  initializationPromise = promise;
  void promise.catch(() => {
    if (initializationPromise === promise) initializationPromise = null;
  });
  return promise;
}

export function addNotificationResponseListener(
  listener: (response: NotificationResponse) => void,
): NotificationResponseSubscription | null {
  const notifications = getNotificationsModule();
  return notifications?.addNotificationResponseReceivedListener(listener) ?? null;
}

export function getLastNotificationResponse(): Promise<NotificationResponse | null> {
  const notifications = getNotificationsModule();
  return notifications?.getLastNotificationResponseAsync() ?? Promise.resolve(null);
}
