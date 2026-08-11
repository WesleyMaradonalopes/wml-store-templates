# LojaBL Backend local

Este serviço é o intermediário seguro entre o app Expo e a VTEX.

## Onde colocar as credenciais

Abra o arquivo `.env` nesta mesma pasta e substitua apenas:

```text
VTEX_APP_KEY=COLE_AQUI_SUA_VTEX_APP_KEY
VTEX_APP_TOKEN=COLE_AQUI_SEU_VTEX_APP_TOKEN
```

As credenciais ficam somente no backend. Nunca coloque esses valores em `wml-store`, em `EXPO_PUBLIC_*` ou em arquivos enviados ao GitHub.

## Como iniciar futuramente

```bash
npm install
npm run dev
```

O serviço ficará em `http://localhost:6001`.

## Endpoint inicial

```text
GET /customer/profile?email=cliente@exemplo.com
```
