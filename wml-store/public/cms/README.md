# CMS do app mobile

`sections.json` é o catálogo local de seções que o app sabe renderizar. Ele serve como contrato/documentação para o conteúdo da home: banner, prateleiras, categorias e texto.

O app lê o conteúdo publicado do projeto definido por `EXPO_PUBLIC_VTEX_CMS_PROJECT_ID` no VTEX Headless CMS. Portanto, editar este arquivo local não publica nem altera o CMS; ele serve como contrato das seções que o app sabe renderizar.

## Botão individual dos banners

Dentro de cada item de `images` da seção `MultipleImageBanner`, use `button` para exibir um botão independente naquele banner. O botão usa o mesmo destino configurado em `action`:

```json
{
  "imageUrl": "https://...",
  "action": {
    "type": "link",
    "value": "/minha-landing-page"
  },
  "button": {
    "enabled": true,
    "label": "Comprar agora",
    "backgroundColor": "#FFFFFF",
    "textColor": "#0A0A0A",
    "borderColor": "#FFFFFF",
    "borderWidth": 0,
    "fontSize": 14,
    "width": 0,
    "height": 0,
    "padding": {
      "horizontal": 24,
      "vertical": 10
    },
    "position": "bottomCenter"
  }
}
```

`width` e `height` iguais a `0` deixam o tamanho automático. A posição pode ser superior, central ou inferior, alinhada à esquerda, ao centro ou à direita. Se `enabled` for `false`, o botão não aparece nesse banner.

## Configuração da BottomTab

O tipo singleton `appSettings` representa as configurações globais do aplicativo. Crie o documento `bottom-bar-settings` e adicione a seção `BottomTabSettings` com os valores de cor e as configurações de cada item:

```json
{
  "backgroundColor": "#7D7D7D",
  "backgroundOpacity": 0.78,
  "borderColor": "#FFFFFF",
  "borderWidth": 0,
  "activeBackgroundColor": "#FFFFFF",
  "activeBackgroundOpacity": 0.16,
  "activeIconColor": "#FFFFFF",
  "inactiveIconColor": "#D9D9D9",
  "activeTextColor": "#FFFFFF",
  "inactiveTextColor": "#D9D9D9",
  "badgeBackgroundColor": "#FFFFFF",
  "badgeTextColor": "#0A0A0A",
  "home": {
    "enabled": true,
    "order": 1,
    "label": "Home"
  },
  "categories": {
    "enabled": true,
    "order": 2,
    "label": "Categorias"
  },
  "favorites": {
    "enabled": true,
    "order": 3,
    "label": "Favoritos"
  },
  "cart": {
    "enabled": true,
    "order": 4,
    "label": "Sacola"
  },
  "account": {
    "enabled": true,
    "order": 5,
    "label": "Conta"
  }
}
```

`borderWidth` aceita valores de 0 a 8. O valor `0` mantém a aparência atual sem borda; para exibir uma borda, informe a cor em `borderColor` e uma espessura maior que zero.

Cada item da BottomTab possui três campos juntos: `enabled` controla a exibição, `order` define a posição e `label` define o nome mostrado. As posições devem ser números de 1 a 5; use cada número uma única vez para evitar empate. Por exemplo, para colocar Favoritos primeiro, use `favorites.order: 1` e mova o Home para outra posição.

Use `enabled: false` para ocultar um item temporariamente; o app mantém a rota disponível mesmo quando o item está oculto.

O app ainda aceita os campos antigos (`homeLabel`, `homeOrder`, `homeEnabled` etc.) como fallback, para que documentos publicados anteriormente continuem funcionando durante a migração.

Durante o teste, a mesma seção também pode ser adicionada ao documento `home`; o aplicativo usa essa configuração como fallback enquanto o documento global ainda não estiver publicado. Publique o documento e reabra/recarregue o aplicativo para buscar os valores atualizados.
