const staticExpoConfig = require('./app.json').expo;

function getIosGoogleUrlScheme(clientId) {
  const suffix = '.apps.googleusercontent.com';
  if (!clientId || !clientId.endsWith(suffix)) return undefined;
  return `com.googleusercontent.apps.${clientId.slice(0, -suffix.length)}`;
}

const iosUrlScheme = getIosGoogleUrlScheme(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '');
const googleSignInOptions = iosUrlScheme ? { iosUrlScheme } : {};

module.exports = {
  ...staticExpoConfig,
  plugins: [
    ...(staticExpoConfig.plugins || []),
    ['react-native-nitro-google-signin', googleSignInOptions],
  ],
};
