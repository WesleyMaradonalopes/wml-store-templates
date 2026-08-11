import Eitri from 'eitri-bifrost'

const apiUrl = 'https://api-admin.widde.io/api/story/stories-collection/_'

export const getWiddeConfig = async () => {
	try {
		const remoteConfig = await Eitri.environment.getRemoteConfigs()
		const domain = remoteConfig?.providerInfo?.domain || remoteConfig?.providerInfo?.host

		return {
			enable: remoteConfig?.widde?.enable === true,
			storeBaseUrl: domain ? (domain.startsWith('http') ? domain : `https://${domain}`) : null,
		}
	} catch (e) {
		console.error('Erro ao ler remote config da Widde', e)
		return { enable: false, storeBaseUrl: null }
	}
}

export const getMidiaByProductSlug = async (productSlug, storeBaseUrl) => {

    if (!productSlug.toLowerCase().startsWith('http') && !productSlug.toLowerCase().startsWith('www')) {
        productSlug = `${storeBaseUrl}/${productSlug.replace(/^\//, '')}`
    }

    const productUrl = new URL(productSlug)
    productUrl.protocol = 'https:'

    const widdeUrl = new URL(apiUrl)
    widdeUrl.searchParams.set('url', productUrl.href)
    widdeUrl.searchParams.set('loadStories', true)
    widdeUrl.searchParams.set('generateViewKey', true)
    widdeUrl.searchParams.set('collectionViewType', 'Story')
    widdeUrl.searchParams.set('webcomponent', 'widde-floating-block')
    widdeUrl.searchParams.set('pageType', 'Product')

    const headers = {
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			'ecommerce-token': 'BR',
			'Referer': 'mobile'
		},
    }

    try {
        const response = await Eitri.http.get(widdeUrl.href, headers)
        return response?.data?.data?.storiesCollections?.collection?.storiesWithLazyLoad || null
    } catch (e) {
        console.error('Erro ao buscar midia', e)
    }

	return null
}
