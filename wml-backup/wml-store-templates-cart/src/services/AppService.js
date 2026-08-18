import { App } from 'eitri-shopping-vtex-shared'

export const startConfigure = async () => {
	await App.tryAutoConfigure({
		providerInfo: {
			"account": "lojahr",
			"domain": "https://www.lojahr.com.br",
			"faststore": "appdev",
			"host": "www.lojahr.com.br",
			"vtexCmsUrl": "https://lojahr.myvtex.com/",
		},
		verbose: false,
		gaVerbose: false,
	})
}
