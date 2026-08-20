# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Checkout com reCAPTCHA

O cartão usa a chave pública reCAPTCHA configurada na VTEX. No development
build, o fluxo tenta primeiro o SDK nativo recomendado para aplicativos móveis.
No Expo Go ou quando o SDK não aceita a chave, usa uma WebView com a origem
`https://lojahr.myvtex.com/` como fallback.

Para o SDK Android aceitar a chave, ela deve ser criada no Google Cloud como
tipo Android, permitir o pacote `br.com.lojahr.store` e, nos development builds
instalados fora da Play Store, permitir distribuição fora da Google Play. Para
iOS, a chave deve ser do tipo iOS e permitir o Bundle ID `br.com.lojahr.store`.

As chaves ficam separadas por plataforma: `EXPO_PUBLIC_VTEX_RECAPTCHA_SITE_KEY`
é a chave Web usada pelo fallback; `EXPO_PUBLIC_VTEX_RECAPTCHA_ANDROID_SITE_KEY`
e `EXPO_PUBLIC_VTEX_RECAPTCHA_IOS_SITE_KEY` são usadas pelos SDKs nativos. As
chaves mobile também precisam estar cadastradas na configuração de reCAPTCHA
do Checkout da VTEX com o projeto e a Google API key correspondentes.

Para validar o checkout completo, prefira o development build já instalado:

```bash
npx expo start --dev-client -c
```

Alterações apenas em JavaScript/TypeScript, como as do checkout, não exigem
recompilar o APK. Gere um novo development build somente quando uma dependência
nativa mudar ou quando o aplicativo ainda não estiver instalado:

```bash
# Windows: contorna o problema do prebuild em caminhos com acentos
npm run android:native
# ou, no macOS com Xcode:
npx expo run:ios
```

Os `clientId`/site keys são públicos e podem ficar em `EXPO_PUBLIC_*`. O
`clientSecret`, a Google API key e outras credenciais permanecem somente na
configuração da VTEX/backend e nunca devem ser colocados em `EXPO_PUBLIC_*`.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
