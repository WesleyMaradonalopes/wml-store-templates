# LojaBL Backend local

Este serviço é o intermediário seguro entre o app Expo e a VTEX.

## Onde colocar as credenciais

Abra o arquivo `.env` nesta mesma pasta e substitua apenas:

```text
VTEX_APP_KEY=COLE_AQUI_SUA_VTEX_APP_KEY
VTEX_APP_TOKEN=COLE_AQUI_SEU_VTEX_APP_TOKEN
```

O padrão usa `VTEX_PAYMENT_GATEWAY=vtexpayments`. Se a conta estiver na integração
Vault, use `VTEX_PAYMENT_GATEWAY=vault`.

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

## Finalização do checkout

O app envia o `orderFormId` e os dados de pagamento para `POST /checkout/order`.
O checkout usa as APIs públicas da VTEX com a sessão do cliente e os cookies de
autorização da transação; `VTEX_APP_KEY` e `VTEX_APP_TOKEN`, quando configurados,
ficam apenas no backend como fallback e para as demais integrações. O backend não
persiste nem registra os dados do cartão nos logs.

Para aprovar uma compra real, a forma de pagamento precisa estar ativa na VTEX e a
afiliação/provedor (por exemplo, Pagar.me) precisa estar com as credenciais válidas.
Para testar somente a criação da transação e a rejeição do pagamento, não é necessário
publicar ou colocar o token Pagar.me no aplicativo.
Se o checkout da conta exigir reCAPTCHA, o cliente também deve fornecer
`captchaToken` e `captchaSiteKey` na requisição.

O pedido pode retornar `status: "completed"`, `status: "pending_payment"` (por
exemplo, Pix aguardando pagamento) ou `status: "payment_failed"`. Neste último caso,
a resposta ainda traz `orderGroup`/`transactionId` quando a VTEX conseguiu criar a
transação, mas isso não significa que o pedido foi aprovado. A VTEX pode cancelá-lo
automaticamente se o pagamento não for concluído.
