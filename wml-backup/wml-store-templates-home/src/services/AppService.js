import { App } from 'eitri-shopping-vtex-shared'

export const startConfigure = async () => {
	await App.tryAutoConfigure({
		providerInfo: {
			"account": "lojabl",
			"domain": "https://www.lojabl.com.br",
			"host": "www.lojabl.com.br",
			"vtexCmsUrl": "https://lojabl.myvtex.com/"
		},
		verbose: false,
		gaVerbose: false,
	})
}
