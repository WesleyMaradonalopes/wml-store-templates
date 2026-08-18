# Migração do app lojahr para Expo

## Estado atual

- Expo Router configurado para iOS, Android e web.
- Integração de leitura com o VTEX Headless CMS (`lojahr-mobile-app`).
- Home, categorias e landing pages carregadas do CMS.
- Busca de produtos usando Intelligent Search API v1.
- Detalhe de produto e prateleiras conectados ao catálogo.
- Carrinho usando `orderForm` VTEX.
- Checkout com cliente, endereço, frete, SLA e seleção de pagamento.
- Finalização do checkout integrada ao fluxo de transação, pagamento e callback da VTEX para cartão e Pix.
- Resultado do pedido com identificadores da transação, QR Code Pix e consulta automática de status.
- Nenhuma dependência ou referência da plataforma legada no diretório `wml-store`.

## Próximas integrações

1. Configurar autenticação do cliente via VTEX ID/OAuth.
2. Migrar perfil, pedidos e favoritos.
3. Validar token de usuário e persistência de sessão no dispositivo.
4. Validar a finalização do pedido em ambiente de testes com as credenciais e afiliações de pagamento ativas.
5. Testar no Android e iOS.
6. Auditar o conteúdo antes de enviar ao repositório próprio.

## Segurança

Não colocar AppKey, AppToken, client secret ou credenciais administrativas no aplicativo mobile. Qualquer segredo deve ficar em um backend seguro ou em configuração protegida do ambiente de build.
