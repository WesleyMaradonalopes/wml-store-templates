# CMS do app mobile

`sections.json` é o catálogo local de seções que o app sabe renderizar. Ele serve como contrato/documentação para o conteúdo da home: banner, prateleiras, categorias e texto.

O app lê o conteúdo publicado do projeto definido por `EXPO_PUBLIC_VTEX_CMS_PROJECT_ID` no VTEX Headless CMS. Portanto, editar este arquivo local não publica nem altera o CMS; ele serve como contrato das seções que o app sabe renderizar.

## Carrossel de produtos por coleção e cor na Home

Adicione a seção `ProductCollectionCarousel` ao documento `home` para exibir os produtos informados no carrossel principal. Ao trocar o produto principal, o app consulta a mesma coleção e a mesma cor exata para montar o carrossel de miniaturas abaixo:

```json
{
  "enabled": true,
  "title": "Produtos em destaque",
  "showTitle": true,
  "backgroundColor": "#F5F1EB",
  "maxItems": 6,
  "products": [
    { "productId": "7474" },
    { "productId": "7445" }
  ]
}
```

Use `enabled: false` para ocultar a seção sem removê-la do documento. Informe o `productId` VTEX, não o SKU. Se não houver outro produto com coleção e cor exatamente iguais, o app mantém apenas o produto principal nas miniaturas.

`backgroundColor` preenche todo o bloco do componente e aceita cores em hexadecimal, `rgb(...)` ou `rgba(...)`. O texto exibido entre o produto principal e as miniaturas usa o nome da coleção retornado pelo catálogo; se o produto não tiver coleção, o nome do produto é usado como fallback.

## Carrossel de vídeos Widde na Home

Adicione a seção `WiddeHomeVideoCarousel` ao documento `home` para exibir os vídeos dos produtos escolhidos manualmente. A ordem dos itens no CMS é preservada e produtos sem vídeo válido são ignorados:

```json
{
  "enabled": true,
  "title": "Vídeos dos produtos",
  "showTitle": true,
  "maxItems": 8,
  "products": [
    { "productId": "7474" },
    { "productId": "7445" },
    { "productId": "7441" }
  ]
}
```

Use `enabled: false` para ocultar a seção sem removê-la do documento. Informe o `productId` VTEX, não o SKU.

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
    "backgroundColor": "rgba(0, 0, 0, 0.72)",
    "textColor": "#FFFFFF",
    "borderColor": "#FFFFFF",
    "blurRadius": 8,
    "borderWidth": 0,
    "fontSize": 14,
    "width": 0,
    "height": 0,
    "padding": {
      "horizontal": 24,
      "vertical": 10
    },
    "position": {
      "top": "70%",
      "left": "50%"
    }
  }
}
```

As cores do botão aceitam `#RGB`, `#RGBA`, `#RRGGBB`, `#RRGGBBAA`, `rgb(...)` e `rgba(...)`. Por exemplo, `rgba(0, 0, 0, 0.72)` aplica 72% de opacidade. Em hexadecimal com transparência, o último par representa o alpha em hexadecimal: `#00000072` equivale a aproximadamente 45% de opacidade.

`blurRadius` define o desfoque do fundo em pixels; use `0` para desativar e `8` para um efeito semelhante a `blur(8px)`. No Android e no iOS, o app usa o `BlurView` nativo. Na web, o mesmo campo gera o efeito equivalente com `backdrop-filter` e `-webkit-backdrop-filter`. Em dispositivos Android antigos, o efeito pode cair para uma camada translúcida por limitação de desempenho.

`width` e `height` iguais a `0` deixam o tamanho automático. `position.top` aceita valores de `0%` a `100%` e define a distância até a parte superior do botão. `position.left` usa o centro horizontal do botão como referência; portanto, use `left: "50%"` para centralizá-lo. Por exemplo, `top: "56%"` e `left: "50%"`. Os valores são compartilhados entre os dispositivos, sem uma configuração mobile separada. Se `enabled` for `false`, o botão não aparece nesse banner.

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
