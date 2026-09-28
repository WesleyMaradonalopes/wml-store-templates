import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';
import type {
  ExpoSpeechRecognitionErrorEvent,
  ExpoSpeechRecognitionNativeEventMap,
  ExpoSpeechRecognitionOptions,
  ExpoSpeechRecognitionResultEvent,
} from 'expo-speech-recognition';

type SpeechRecognitionEventName = 'start' | 'end' | 'result' | 'error';
type SpeechRecognitionPermission = { granted: boolean };
type SpeechRecognitionSubscription = { remove: () => void };

type SpeechRecognitionModule = {
  isRecognitionAvailable: () => boolean;
  requestPermissionsAsync: () => Promise<SpeechRecognitionPermission>;
  start: (options: ExpoSpeechRecognitionOptions) => void;
  stop: () => void;
  abort: () => void;
  addListener: <K extends SpeechRecognitionEventName>(
    eventName: K,
    listener: (event: ExpoSpeechRecognitionNativeEventMap[K]) => void,
  ) => SpeechRecognitionSubscription;
};

type SpeechRecognitionPackage = {
  ExpoSpeechRecognitionModule: SpeechRecognitionModule;
};

export type VoiceRecognitionResultEvent = ExpoSpeechRecognitionResultEvent;
export type VoiceRecognitionErrorEvent = ExpoSpeechRecognitionErrorEvent;

let moduleResolved = false;
let speechRecognitionModule: SpeechRecognitionModule | null = null;

function getSpeechRecognitionModule() {
  if (moduleResolved) return speechRecognitionModule;
  moduleResolved = true;

  try {
    if (Platform.OS === 'web') {
      const packageExports = require('expo-speech-recognition') as SpeechRecognitionPackage;
      speechRecognitionModule = packageExports.ExpoSpeechRecognitionModule ?? null;
    } else {
      speechRecognitionModule = requireOptionalNativeModule<SpeechRecognitionModule>('ExpoSpeechRecognition');
    }
  } catch {
    speechRecognitionModule = null;
  }

  return speechRecognitionModule;
}

export function isSpeechRecognitionModuleInstalled() {
  return getSpeechRecognitionModule() !== null;
}

export function isSpeechRecognitionAvailable() {
  try {
    return getSpeechRecognitionModule()?.isRecognitionAvailable() ?? false;
  } catch {
    return false;
  }
}

export async function requestSpeechRecognitionPermissions() {
  try {
    return await getSpeechRecognitionModule()?.requestPermissionsAsync();
  } catch {
    return null;
  }
}

export function startSpeechRecognition(options: ExpoSpeechRecognitionOptions) {
  try {
    getSpeechRecognitionModule()?.start(options);
  } catch {
    // The screen will show the unavailable state through the error event or availability check.
  }
}

export function stopSpeechRecognition() {
  try {
    getSpeechRecognitionModule()?.stop();
  } catch {
    // Ignore stop errors when the native session has already ended.
  }
}

export function abortSpeechRecognition() {
  try {
    getSpeechRecognitionModule()?.abort();
  } catch {
    // Ignore abort errors while cleaning up the screen.
  }
}

export function subscribeSpeechRecognitionEvent<K extends SpeechRecognitionEventName>(
  eventName: K,
  listener: (event: ExpoSpeechRecognitionNativeEventMap[K]) => void,
) {
  try {
    return getSpeechRecognitionModule()?.addListener(eventName, listener) ?? null;
  } catch {
    return null;
  }
}
