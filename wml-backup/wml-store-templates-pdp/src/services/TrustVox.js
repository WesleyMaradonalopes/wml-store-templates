import Eitri from 'eitri-bifrost'

const STORE_ID = '111609'
const STORE_URL = 'https://www.lojabl.com.br'

let cachedPromise = null

export const getRootInfo = async (productId) => {
	if (!cachedPromise) {
		const requestUrl = `https://trustvox.com.br/widget/root?code=${productId}&store_id=${STORE_ID}`
		cachedPromise = Eitri.http
			.get(requestUrl, {
				headers: {
					'accept': 'application/vnd.trustvox-v2+json',
					'accept-language': 'en-US,en;q=0.9,pt;q=0.8',
					'cache-control': 'no-cache',
					'origin': STORE_URL,
					'pragma': 'no-cache',
					'priority': 'u=1, i',
					'referer': STORE_URL,
					'sec-fetch-mode': 'cors',
					'sec-fetch-site': 'cross-site',
				},
			})
			.then((result) => result.data)
	}

	return cachedPromise
}

export const getRecommendationsSummaries = async (productId) => {
	const result = await Eitri.http.get(
		`https://trustvox.com.br/opinions/recommendations_summaries?product_id=${productId}&store_id=${STORE_ID}`,
		{
			headers: {
				origin: STORE_URL,
			},
		},
	)
	return result.data
}

export const getOpinions = async (productId, page = 1, orderBy = '-created_at', perPage = '4') => {
	const result = await Eitri.http.get(
		`https://trustvox.com.br/widget/opinions?code=${productId}&store_id=${STORE_ID}&page=${page}&per=${perPage}&order_by=${orderBy}`,
		{
			headers: {
				'accept': 'application/vnd.trustvox-v2+json',
				'accept-language': 'en-US,en;q=0.9,pt;q=0.8',
				'cache-control': 'no-cache',
				'origin': STORE_URL,
				'pragma': 'no-cache',
				'priority': 'u=1, i',
				'referer': STORE_URL,
				'sec-fetch-mode': 'cors',
				'sec-fetch-site': 'cross-site',
			},
		},
	)
	return result.data
}
