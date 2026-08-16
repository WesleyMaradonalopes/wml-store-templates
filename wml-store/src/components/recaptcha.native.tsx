import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { NativeModules, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { executeAction, initializeRecaptcha } from 'react-native-recaptcha-enterprise';

import { storeConfig } from '@/config/store';
import type { RecaptchaHandle, RecaptchaProps } from './recaptcha';

// Public site key used by the working app-test-one checkout. This is safe to
// bundle in the app; API keys/client secrets must remain on the server.
const DEFAULT_SITE_KEY = '6LeYIh0qAAAAANOiLphZJNLG5JTHhBZHUPkhJfZU';

type PendingRequest = {
  key: string;
  resolve: (value: string | null) => void;
  reject: (error: Error) => void;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string) {
  return Promise.race([
    promise,
    new Promise<T>((_resolve, reject) => {
      setTimeout(() => reject(new Error(message)), timeoutMs);
    }),
  ]);
}

function nativeErrorSummary(error: unknown) {
  if (!error || typeof error !== 'object') return String(error || 'erro desconhecido');
  const record = error as { code?: string | number; message?: string };
  return [record.code, record.message].filter(Boolean).join(': ') || 'erro desconhecido';
}

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, (character) => entities[character] || character);
}

function buildCaptchaHtml(siteKey: string) {
  const safeSiteKey = escapeHtml(siteKey);
  const scriptKey = JSON.stringify(siteKey).replace(/</g, '\\u003c');
  return `<!doctype html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1" />
<script src="https://www.google.com/recaptcha/enterprise.js?render=${safeSiteKey}"></script>
<script src="https://www.google.com/recaptcha/api.js?render=${safeSiteKey}"></script>
</head><body><script>
(function () {
  var key = ${scriptKey};
  function signal(message) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
  window.getVtexRecaptchaToken = function () {
    var attempts = 0;
    function execute() {
      if (!window.grecaptcha || !window.grecaptcha.enterprise) {
        attempts += 1;
        if (attempts < 40) { window.setTimeout(execute, 250); return; }
        signal({ type: 'error', message: 'Falha ao carregar a validacao de seguranca.' });
        return;
      }
      function executeClassic() {
        if (!window.grecaptcha || typeof window.grecaptcha.execute !== 'function') {
          signal({ type: 'error', message: 'Falha ao inicializar o reCAPTCHA.' });
          return;
        }
        Promise.resolve(window.grecaptcha.execute(key, { action: 'submit' }))
          .then(function (token) { signal({ type: 'token', token: token || '' }); })
          .catch(function (error) {
            signal({ type: 'error', message: String(error && error.message || error || 'Falha no reCAPTCHA') });
          });
      }
      if (window.grecaptcha.enterprise && typeof window.grecaptcha.enterprise.execute === 'function') {
        var enterpriseReady = false;
        window.setTimeout(function () {
          if (!enterpriseReady) executeClassic();
        }, 5000);
        window.grecaptcha.enterprise.ready(function () {
          enterpriseReady = true;
          window.grecaptcha.enterprise.execute(key, { action: 'submit' })
            .then(function (token) { signal({ type: 'token', token: token || '' }); })
            .catch(executeClassic);
        });
      } else {
        executeClassic();
      }
    }
    execute();
  };
  window.resetVtexRecaptcha = function () {
    if (window.grecaptcha && typeof window.grecaptcha.reset === 'function') {
      try { window.grecaptcha.reset(); } catch (_) {}
    }
  };
}());
</script></body></html>`;
}

const Recaptcha = forwardRef<RecaptchaHandle, RecaptchaProps>(({ siteKey }, ref) => {
  const configuredSiteKey = String(siteKey || process.env.EXPO_PUBLIC_VTEX_RECAPTCHA_SITE_KEY || DEFAULT_SITE_KEY).trim();
  const [activeSiteKey, setActiveSiteKey] = useState(configuredSiteKey);
  const activeSiteKeyRef = useRef(configuredSiteKey);
  const webViewRef = useRef<WebView>(null);
  const webViewReadyRef = useRef(false);
  const pendingRequestRef = useRef<PendingRequest | null>(null);
  const nativeSiteKeyRef = useRef('');
  const nativeInitializationRef = useRef<Promise<void> | null>(null);
  const unsupportedNativeKeysRef = useRef(new Set<string>());

  useEffect(() => {
    const nextSiteKey = String(siteKey || process.env.EXPO_PUBLIC_VTEX_RECAPTCHA_SITE_KEY || DEFAULT_SITE_KEY).trim();
    if (!nextSiteKey || nextSiteKey === activeSiteKeyRef.current) return;
    webViewReadyRef.current = false;
    activeSiteKeyRef.current = nextSiteKey;
    setActiveSiteKey(nextSiteKey);
  }, [siteKey]);

  useEffect(() => () => {
    pendingRequestRef.current?.reject(new Error('reCAPTCHA desmontado.'));
    pendingRequestRef.current = null;
  }, []);

  async function getNativeToken(requestedKey: string) {
    if (!NativeModules.RecaptchaEnterprise || unsupportedNativeKeysRef.current.has(requestedKey)) return null;
    if (nativeSiteKeyRef.current !== requestedKey || !nativeInitializationRef.current) {
      nativeSiteKeyRef.current = requestedKey;
      nativeInitializationRef.current = initializeRecaptcha(requestedKey);
    }

    try {
      await withTimeout(
        nativeInitializationRef.current,
        12000,
        'O SDK nativo demorou para inicializar.',
      );
      const token = await withTimeout(
        executeAction('checkout'),
        12000,
        'O SDK nativo demorou para gerar o token.',
      );
      if (!token) throw new Error('O SDK nativo retornou um token vazio.');
      console.info('[RECAPTCHA] token generated via native SDK');
      return token;
    } catch (error) {
      const summary = nativeErrorSummary(error);
      if (/invalid|site key|package/i.test(summary)) unsupportedNativeKeysRef.current.add(requestedKey);
      nativeSiteKeyRef.current = '';
      nativeInitializationRef.current = null;
      console.warn(`[RECAPTCHA] native SDK unavailable (${summary}); using WebView`);
      return null;
    }
  }

  function getWebViewToken(requestedKey: string) {
    return new Promise<string | null>((resolve, reject) => {
      if (pendingRequestRef.current) {
        pendingRequestRef.current.reject(new Error('Solicitação anterior de reCAPTCHA cancelada.'));
        pendingRequestRef.current = null;
      }

      let request: PendingRequest;
      const timeoutId = setTimeout(() => {
        if (pendingRequestRef.current !== request) return;
        pendingRequestRef.current = null;
        reject(new Error('A validação de segurança demorou mais que o esperado.'));
      }, 20000);

      request = {
        key: requestedKey,
        resolve: (value) => { clearTimeout(timeoutId); resolve(value); },
        reject: (error) => { clearTimeout(timeoutId); reject(error); },
      };
      pendingRequestRef.current = request;

      if (requestedKey !== activeSiteKeyRef.current) {
        webViewReadyRef.current = false;
        activeSiteKeyRef.current = requestedKey;
        setActiveSiteKey(requestedKey);
      }

      const injectWhenReady = () => {
        if (pendingRequestRef.current !== request) return;
        if (!webViewRef.current || !webViewReadyRef.current || activeSiteKeyRef.current !== request.key) {
          setTimeout(injectWhenReady, 150);
          return;
        }
        try {
          webViewRef.current.injectJavaScript('window.getVtexRecaptchaToken && window.getVtexRecaptchaToken(); true;');
        } catch (error) {
          pendingRequestRef.current = null;
          request.reject(error instanceof Error ? error : new Error('Falha ao executar o reCAPTCHA.'));
        }
      };
      injectWhenReady();
    });
  }

  async function getToken(requestedSiteKey?: string) {
    const requestedKey = String(requestedSiteKey || activeSiteKeyRef.current || configuredSiteKey || DEFAULT_SITE_KEY).trim();
    if (!requestedKey) return null;

    const nativeToken = await getNativeToken(requestedKey);
    if (nativeToken) return nativeToken;
    const webToken = await getWebViewToken(requestedKey);
    if (webToken) console.info('[RECAPTCHA] token generated via WebView');
    return webToken;
  }

  useImperativeHandle(ref, () => ({
    getToken,
    reset: () => {
      webViewRef.current?.injectJavaScript('window.resetVtexRecaptcha && window.resetVtexRecaptcha(); true;');
    },
  }));

  function handleMessage(event: WebViewMessageEvent) {
    let payload: { type?: string; token?: string; message?: string } = {};
    try { payload = JSON.parse(event.nativeEvent.data) as typeof payload; } catch { return; }
    const request = pendingRequestRef.current;
    if (!request) return;
    pendingRequestRef.current = null;
    if (payload.type === 'token' && payload.token) {
      request.resolve(String(payload.token));
      return;
    }
    request.reject(new Error(payload.message || 'Não foi possível validar o reCAPTCHA.'));
  }

  function rejectPending(message: string) {
    const request = pendingRequestRef.current;
    if (!request) return;
    pendingRequestRef.current = null;
    request.reject(new Error(message));
  }

  if (!activeSiteKey) return null;
  return (
    <View pointerEvents="none" style={styles.container} accessible={false}>
      <WebView
        key={activeSiteKey}
        ref={webViewRef}
        originWhitelist={['*']}
        source={{ html: buildCaptchaHtml(activeSiteKey), baseUrl: `${storeConfig.vtexBaseUrl}/` }}
        javaScriptEnabled
        domStorageEnabled
        onLoadStart={() => { webViewReadyRef.current = false; }}
        onLoadEnd={() => { webViewReadyRef.current = true; }}
        onError={(event) => rejectPending(event.nativeEvent.description || 'Falha ao carregar a validação de segurança.')}
        onHttpError={() => rejectPending('Falha ao carregar a validação de segurança.')}
        onMessage={handleMessage}
        style={styles.webView}
      />
    </View>
  );
});

Recaptcha.displayName = 'RecaptchaNative';

const styles = StyleSheet.create({
  container: { position: 'absolute', left: -10, top: -10, width: 2, height: 2, opacity: 0.01 },
  webView: { width: 2, height: 2, backgroundColor: 'transparent' },
});

export default Recaptcha;
