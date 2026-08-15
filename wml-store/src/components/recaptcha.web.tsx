import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import type { RecaptchaHandle, RecaptchaProps } from './recaptcha';

type RecaptchaEnterprise = {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

type RecaptchaClient = {
  ready?: (callback: () => void) => void;
  render?: (container: HTMLElement, parameters: Record<string, unknown>) => number;
  execute?: (widgetId: number) => Promise<string> | void;
  reset?: (widgetId?: number) => void;
  enterprise?: RecaptchaEnterprise;
};

declare global {
  interface Window {
    grecaptcha?: RecaptchaClient;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRecaptchaScript(siteKey: string) {
  if (typeof document === 'undefined') return Promise.reject(new Error('reCAPTCHA só está disponível no navegador.'));
  if (window.grecaptcha) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector('script[data-vtex-recaptcha="true"]') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Não foi possível carregar o reCAPTCHA.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.defer = true;
    script.dataset.vtexRecaptcha = 'true';
    script.src = `https://www.google.com/recaptcha/enterprise.js?render=${encodeURIComponent(siteKey)}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Não foi possível carregar o reCAPTCHA.'));
    document.head.appendChild(script);
  }).catch((error) => {
    scriptPromise = null;
    throw error;
  });
  return scriptPromise;
}

const Recaptcha = forwardRef<RecaptchaHandle, RecaptchaProps>(({ siteKey }, ref) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<number | null>(null);
  const readyPromiseRef = useRef<Promise<void> | null>(null);
  const pendingTokenRef = useRef<((token: string | null) => void) | null>(null);

  useEffect(() => {
    let active = true;
    widgetIdRef.current = null;
    readyPromiseRef.current = null;

    if (!siteKey || !containerRef.current) return () => { active = false; };

    void loadRecaptchaScript(siteKey).then(() => {
      if (!active || !window.grecaptcha || !containerRef.current) return;
      const client = window.grecaptcha;

      if (client.enterprise) {
        readyPromiseRef.current = new Promise<void>((resolve) => client.enterprise?.ready(resolve));
        return;
      }

      if (!client.ready || !client.render) return;
      readyPromiseRef.current = new Promise<void>((resolve) => {
        client.ready?.(() => {
          if (!active || !containerRef.current || !client.render) return resolve();
          widgetIdRef.current = client.render(containerRef.current, {
            sitekey: siteKey,
            size: 'invisible',
            callback: (token: string) => pendingTokenRef.current?.(token),
            'expired-callback': () => pendingTokenRef.current?.(null),
            'error-callback': () => pendingTokenRef.current?.(null),
          });
          resolve();
        });
      });
    }).catch(() => {
      readyPromiseRef.current = Promise.reject(new Error('Não foi possível carregar o reCAPTCHA.'));
    });

    return () => {
      active = false;
      pendingTokenRef.current?.(null);
      pendingTokenRef.current = null;
    };
  }, [siteKey]);

  useImperativeHandle(ref, () => ({
    getToken: async () => {
      if (!siteKey || !window.grecaptcha) return null;
      try {
        await readyPromiseRef.current;
        const client = window.grecaptcha;
        if (client.enterprise) return await client.enterprise.execute(siteKey, { action: 'submit' });
        if (widgetIdRef.current === null || !client.execute) return null;

        return await new Promise<string | null>((resolve) => {
          pendingTokenRef.current = (token) => {
            pendingTokenRef.current = null;
            resolve(token);
          };
          const result = client.execute?.(widgetIdRef.current as number);
          if (result && typeof result.then === 'function') {
            result.then((token) => {
              pendingTokenRef.current = null;
              resolve(token);
            }).catch(() => {
              pendingTokenRef.current = null;
              resolve(null);
            });
          }
        });
      } catch {
        return null;
      }
    },
    reset: () => {
      const widgetId = widgetIdRef.current;
      if (widgetId !== null) window.grecaptcha?.reset?.(widgetId);
    },
  }), [siteKey]);

  if (!siteKey) return null;
  return <View style={styles.container}><div ref={containerRef} /></View>;
});

Recaptcha.displayName = 'RecaptchaWeb';

const styles = StyleSheet.create({
  container: { minHeight: 8, width: '100%', alignItems: 'center' },
});

export default Recaptcha;
