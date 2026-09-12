# CMS do app mobile

`sections.json` é o catálogo local de seções que o app sabe renderizar. Ele serve como contrato/documentação para o conteúdo da home: banner, prateleiras, categorias e texto.

O app lê o conteúdo publicado do projeto definido por `EXPO_PUBLIC_VTEX_CMS_PROJECT_ID` no VTEX Headless CMS. Portanto, editar este arquivo local não publica nem altera o CMS; ele serve como contrato das seções que o app sabe renderizar.

## Configuração da BottomTab

O tipo singleton `appSettings` representa as configurações globais do aplicativo. Crie o documento `bottom-bar-settings` e adicione a seção `BottomTabSettings` com os valores de cor, textos e posições desejados:

```json
{
  "backgroundColor": "#7D7D7D",
  "backgroundOpacity": 0.78,
  "activeBackgroundColor": "#FFFFFF",
  "activeBackgroundOpacity": 0.16,
  "activeIconColor": "#FFFFFF",
  "inactiveIconColor": "#D9D9D9",
  "activeTextColor": "#FFFFFF",
  "inactiveTextColor": "#D9D9D9",
  "badgeBackgroundColor": "#FFFFFF",
  "badgeTextColor": "#0A0A0A",
  "homeLabel": "Home",
  "categoriesLabel": "Categorias",
  "favoritesLabel": "Favoritos",
  "cartLabel": "Sacola",
  "accountLabel": "Conta",
  "homeOrder": 1,
  "categoriesOrder": 2,
  "favoritesOrder": 3,
  "cartOrder": 4,
  "accountOrder": 5,
  "homeEnabled": true,
  "categoriesEnabled": true,
  "favoritesEnabled": true,
  "cartEnabled": true,
  "accountEnabled": true
}
```

As posições devem ser números de 1 a 5. Use cada número uma única vez para evitar empate; por exemplo, para colocar Favoritos primeiro, use `favoritesOrder: 1` e mova o Home para outra posição.

Os campos `*Enabled` controlam se cada item aparece na BottomTab. Use `false` para ocultar um item temporariamente; o app mantém a rota disponível mesmo quando o item está oculto.

Durante o teste, a mesma seção também pode ser adicionada ao documento `home`; o aplicativo usa essa configuração como fallback enquanto o documento global ainda não estiver publicado. Publique o documento e reabra/recarregue o aplicativo para buscar os valores atualizados.
