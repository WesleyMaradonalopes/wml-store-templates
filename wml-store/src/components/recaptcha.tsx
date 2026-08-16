import { forwardRef, useImperativeHandle } from 'react';

export type RecaptchaHandle = {
  getToken: (siteKey?: string) => Promise<string | null>;
  reset: () => void;
};

export type RecaptchaProps = {
  siteKey: string;
};

// Expo resolves recaptcha.web.tsx/recaptcha.native.tsx at runtime. This
// fallback keeps TypeScript and non-platform builds type-safe.
const Recaptcha = forwardRef<RecaptchaHandle, RecaptchaProps>((_props, ref) => {
  useImperativeHandle(ref, () => ({
    getToken: async () => null,
    reset: () => undefined,
  }), []);
  return null;
});

Recaptcha.displayName = 'Recaptcha';

export default Recaptcha;
