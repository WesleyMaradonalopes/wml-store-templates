import { Vtex } from 'eitri-shopping-vtex-shared'

/**
 * Obtém os termos mais buscados da loja via VTEX Intelligent Search API.
 * Endpoint: /api/io/_v/api/intelligent-search/top_searches
 *
 * Retorna um array de objetos: [{ term: string, count: number }, ...]
 * Fallback: retorna array vazio em caso de erro
 */
export const getTopSearches = async () => {
	try {
		const result = await Vtex.catalog.topSearches()

		if (result?.searches) {
			return result.searches
		}

		return result || []
	} catch (error) {
		console.error('Erro ao buscar top searches da VTEX', error)
		return []
	}
}

/**
 * Obtém sugestão de correção ortográfica via VTEX Intelligent Search.
 * Endpoint: /api/io/_v/api/intelligent-search/correction_search?query={term}
 *
 * Retorna o termo corrigido ou null se não houver correção.
 */
export const getCorrectionSearch = async (query) => {
	try {
		if (!query) return null

		const result = await Vtex.http.get(
			`/api/io/_v/api/intelligent-search/correction_search?query=${encodeURIComponent(query)}`,
			{},
			Vtex.configs.api,
		)

        console.log('Resposta da API de correção ortográfica:', result) // DEBUG: log completo da resposta

		// A resposta vem no formato: { data: { correction: { text: "top", misspelled: true, ... } } }
		const correction = result?.data?.correction || result?.correction

		if (correction?.misspelled && correction?.text) {
			return correction.text
		}

		return null
	} catch (error) {
		console.error('Erro ao buscar correção ortográfica', error)
		return null
	}
}

/**
 * Obtém o histórico de buscas do usuário (armazenado localmente).
 * Como a VTEX não expõe histórico de busca por sessão como API pública,
 * utilizamos armazenamento local no dispositivo.
 */
export const getSearchHistory = async () => {
	try {
		const history = await window.EITRI?.sharedStorage?.getItemJson('searchHistory')
		return history || []
	} catch {
		return []
	}
}

/**
 * Salva um termo no histórico de buscas local.
 */
export const saveSearchTerm = async (term) => {
	try {
		if (!term) return
		const history = (await getSearchHistory()) || []
		const updated = [term, ...history.filter((t) => t !== term)].slice(0, 20)
		await window.EITRI?.sharedStorage?.setItemJson('searchHistory', updated)
	} catch {
		// silencioso
	}
}
