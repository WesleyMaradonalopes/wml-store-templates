# Deep links

O app usa o esquema próprio `lojahr:` e também reconhece URLs públicas da loja
sem depender de bibliotecas ou runtime da Eitri.

## Rotas reconhecidas

- `lojahr://product/{id-ou-slug}` e `https://www.hoperesort.com.br/{slug}/p`
  abrem o produto.
- `lojahr://categoria/{slug}`, `/categoria/{slug}` e URLs VTEX com
  `?map=c,c` abrem a listagem filtrada por categoria.
- `/colecao/{slug}` e `/collection/{slug}` abrem a listagem da coleção.
- `/page/{slug}`, `/campanha/{slug}` e `/campaign/{slug}` abrem uma página CMS.
- `/busca?q=...` e `/search?q=...` abrem a busca.

Links de outros domínios continuam sendo tratados como links externos. Links
inválidos não devem interromper a inicialização do aplicativo.

## Configuração do domínio em produção

O `app.json` já contém os `associatedDomains` do iOS e os `intentFilters` do
Android. Para que o sistema operacional verifique a associação, ainda é
necessário publicar os arquivos abaixo no domínio público. Eles dependem das
credenciais reais de assinatura e não devem ser preenchidos com valores de
exemplo.

Android:

`https://www.hoperesort.com.br/.well-known/assetlinks.json`

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "br.com.lojahr.store",
      "sha256_cert_fingerprints": ["SHA256_DO_CERTIFICADO_DE_RELEASE"]
    }
  }
]
```

iOS:

`https://www.hoperesort.com.br/.well-known/apple-app-site-association`

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["TEAM_ID.br.com.lojahr.store"],
        "components": [{ "/": "/*" }]
      }
    ]
  }
}
```

Se o domínio sem `www` continuar sendo usado, os mesmos arquivos também devem
estar disponíveis nele. Depois de alterar `app.json` ou os arquivos de
associação, é necessário gerar um novo build nativo para testar os links.
