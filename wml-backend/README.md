# lojahr Backend local

Este serviço é o intermediário seguro entre o app Expo e a VTEX.

## Onde colocar as credenciais

Abra o arquivo `.env` nesta mesma pasta e substitua apenas:

```text
VTEX_APP_KEY=COLE_AQUI_SUA_VTEX_APP_KEY
VTEX_APP_TOKEN=COLE_AQUI_SEU_VTEX_APP_TOKEN
```

O envio de pagamentos usa o endpoint atual do VTEX Vault:
`https://{account}.vtexvault.com/api/payments/transactions/{transactionId}/payments`.
Não é necessário configurar uma variável de gateway para esse fluxo.

As credenciais ficam somente no backend. Nunca coloque esses valores em `wml-store`, em `EXPO_PUBLIC_*` ou em arquivos enviados ao GitHub.

## Como iniciar futuramente

```bash
npm install
npm run dev
```

O serviço ficará em `http://localhost:6001`.

## Persistência de sessão

O backend mantém em memória apenas um cache local das sessões VTEX e dos
cookies de propriedade do `orderForm`. Para homologação e produção, configure
`REDIS_URL` com a URL privada de um Redis/Render Key Value e, opcionalmente,
`SESSION_STORE_TTL_SECONDS` (padrão: 24 horas). Os valores sensíveis ficam no
Redis e não são enviados ao app nem registrados nos logs.

Sem `REDIS_URL`, o fallback em memória continua disponível para desenvolvimento
local, mas os dados de sessão serão perdidos quando o processo reiniciar.

## Teste controlado de sessão expirada

O backend possui uma rota exclusiva para homologação:

```text
GET /qa/session-expired
Header: X-Session-Expiry-Test-Key: <chave do ambiente>
```

Ela retorna `401` sem consultar a VTEX e sem criar pedido, mas só fica ativa
quando `APP_ENV` é um ambiente não produtivo (`development`, `test`, `staging`
ou `homolog`), `SESSION_EXPIRY_TEST_ENABLED=true` e a chave do header coincide
com `SESSION_EXPIRY_TEST_KEY`. Em produção, a rota permanece indisponível por
configuração.

## Schemas do Headless CMS

O backend também disponibiliza os schemas do projeto Custom em:

```text
GET /cms/sections.json
GET /cms/content-types.json
```

No ambiente local, esses arquivos são lidos de
`wml-store/public/cms`. Quando o backend for publicado separado do
monorepo, defina `CMS_SCHEMAS_DIR` apontando para a pasta que contém os dois
arquivos.

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
