import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { executeAction, initializeRecaptcha } from 'react-native-recaptcha-enterprise';

import { storeConfig } from '@/config/store';
import type { RecaptchaHandle, RecaptchaProps } from './recaptcha';

function createRecaptchaHtml(siteKey: string) {
  const serializedKey = JSON.stringify(siteKey).replace(/</g, '\\u003c');
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width, initial-scale=1" />
<script src="https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}" async defer></script>
</head><body><div id="recaptcha"></div><script>
(function () {
  var key = ${serializedKey};
  var widgetId = null;
  var readySent = false;
  var readyTimeout = null;
  function send(type, value) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify({ type: type, value: value || '' }));
  }
  function sendReady() {
    if (readySent) return;
    readySent = true;
    if (readyTimeout) window.clearTimeout(readyTimeout);
    send('ready');
  }
  function init() {
    if (!window.grecaptcha) { window.setTimeout(init, 200); return; }
    if (window.grecaptcha.enterprise) {
      window.grecaptcha.enterprise.ready(function () { sendReady(); });
      return;
    }
    try {
      widgetId = window.grecaptcha.render('recaptcha', {
        sitekey: key,
        size: 'invisible',
        callback: function (token) { send('token', token); },
        'expired-callback': function () { send('error', 'expired'); },
        'error-callback': function () { send('error', 'error'); }
      });
      sendReady();
    } catch (error) { send('error', String(error)); }
  }
  window.__runRecaptcha = function () {
    if (!window.grecaptcha) { send('error', 'not-ready'); return; }
    if (window.grecaptcha.enterprise) {
      window.grecaptcha.enterprise.ready(function () {
        window.grecaptcha.enterprise.execute(key, { action: 'submit' })
          .then(function (token) { send('token', token); })
          .catch(function (error) { send('error', String(error)); });
      });
      return;
    }
    if (widgetId === null) { send('error', 'not-ready'); return; }
    window.grecaptcha.execute(widgetId);
  };
  window.__resetRecaptcha = function () { if (window.grecaptcha && widgetId !== null) window.grecaptcha.reset(widgetId); };
  readyTimeout = window.setTimeout(function () { if (!readySent) send('error', 'timeout'); }, 20000);
  init();
}());
</script></body></html>`;
}

const Recaptcha = forwardRef<RecaptchaHandle, RecaptchaProps>(({ siteKey }, ref) => {
  const webViewRef = useRef<WebView>(null);
  const readyRef = useRef(false);
  const readyPromiseRef = useRef<Promise<boolean> | null>(null);
  const readyResolverRef = useRef<((ready: boolean) => void) | null>(null);
  const nativeReadyRef = useRef(false);
  const nativePromiseRef = useRef<Promise<boolean> | null>(null);
  const pendingTokenRef = useRef<((token: string | null) => void) | null>(null);

  useEffect(() => {
    readyRef.current = false;
    nativeReadyRef.current = false;
    readyPromiseRef.current = new Promise((resolve) => { readyResolverRef.current = resolve; });
    nativePromiseRef.current = Promise.resolve().then(() => initializeRecaptcha(siteKey)).then(() => {
      nativeReadyRef.current = true;
      return true;
    }).catch(() => false);
    return () => {
      nativeReadyRef.current = false;
      readyResolverRef.current?.(false);
      readyResolverRef.current = null;
      pendingTokenRef.current?.(null);
      pendingTokenRef.current = null;
    };
  }, [siteKey]);

  function handleMessage(event: WebViewMessageEvent) {
    let payload: { type?: string; value?: string } = {};
    try { payload = JSON.parse(event.nativeEvent.data) as typeof payload; } catch { return; }
    if (payload.type === 'ready') {
      readyRef.current = true;
      readyResolverRef.current?.(true);
      readyResolverRef.current = null;
    }
    if (payload.type === 'token' || payload.type === 'error') {
      if (payload.type === 'error') {
        readyResolverRef.current?.(false);
        readyResolverRef.current = null;
      }
      pendingTokenRef.current?.(payload.type === 'token' ? String(payload.value || '') || null : null);
      pendingTokenRef.current = null;
    }
  }

  useImperativeHandle(ref, () => ({
    getToken: async () => {
      if (!siteKey || !webViewRef.current) return null;
      const nativeReady = await Promise.race([
        nativePromiseRef.current || Promise.resolve(false),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 5000)),
      ]);
      if (nativeReady && nativeReadyRef.current) {
        try {
          const token = await executeAction('checkout');
          if (token) return token;
        } catch {
          // Fall back to the WebView implementation when the native SDK cannot execute.
        }
      }
      if (!readyRef.current) {
        const ready = await Promise.race([
          readyPromiseRef.current || Promise.resolve(false),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 20000)),
        ]);
        if (!ready) return null;
      }

      return await new Promise<string | null>((resolve) => {
        const timeout = setTimeout(() => {
          pendingTokenRef.current = null;
          resolve(null);
        }, 90000);
        pendingTokenRef.current = (token) => {
          clearTimeout(timeout);
          pendingTokenRef.current = null;
          resolve(token);
        };
        webViewRef.current?.injectJavaScript('window.__runRecaptcha && window.__runRecaptcha(); true;');
      });
    },
    reset: () => {
      webViewRef.current?.injectJavaScript('window.__resetRecaptcha && window.__resetRecaptcha(); true;');
    },
  }), [siteKey]);

  if (!siteKey) return null;
  return <View style={styles.container} accessible accessibilityLabel="Verificação de segurança">
    <WebView
      ref={webViewRef}
      originWhitelist={['*']}
      source={{ html: createRecaptchaHtml(siteKey), baseUrl: `${storeConfig.domain}/` }}
      javaScriptEnabled
      domStorageEnabled
      onMessage={handleMessage}
      onError={() => {
        readyResolverRef.current?.(false);
        readyResolverRef.current = null;
      }}
      onHttpError={() => {
        readyResolverRef.current?.(false);
        readyResolverRef.current = null;
      }}
      style={styles.webView}
    />
  </View>;
});

Recaptcha.displayName = 'RecaptchaNative';

const styles = StyleSheet.create({
  container: { width: '100%', minHeight: 42, overflow: 'hidden', alignItems: 'center' },
  webView: { width: 320, height: 42, backgroundColor: 'transparent' },
});

export default Recaptcha;
