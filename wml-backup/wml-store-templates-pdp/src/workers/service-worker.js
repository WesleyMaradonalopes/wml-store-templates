const CACHE_NAME_PREFIX = 'image-cache_'
const MAX_AGE = 12 * 24 * 60 * 60 * 1000 // 24 horas

/**
 * Retorna o nome de um cache válido ou cria um novo
 */
const getValidCacheName = async () => {
	const currentTimestamp = Date.now()
	const newCacheName = `${CACHE_NAME_PREFIX}${currentTimestamp}`

	try {
		const cacheKeys = await caches.keys()

		// Encontrar um cache válido
		const validCacheName = cacheKeys.find((cacheName) => {
			if (!cacheName.startsWith(CACHE_NAME_PREFIX)) return false
			const cacheTimestamp = Number(cacheName.split('_')[1])
			return cacheTimestamp > currentTimestamp - MAX_AGE
		})

		if (validCacheName) {
			return validCacheName
		}

		// Remover caches antigos
		await Promise.all(cacheKeys.map(caches.delete))

		return newCacheName
	} catch (error) {
		console.error('Erro ao verificar o cache:', error)
		return newCacheName
	}
}

/**
 * Cria uma resposta com uma imagem em branco
 */
const getBlankImageResponse = () => {
	const b64String = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAoMBgDTD2qgAAAAASUVORK5CYII='
	const byteString = atob(b64String)
	const arrayBuffer = new ArrayBuffer(byteString.length)
	const intArray = new Uint8Array(arrayBuffer)

	for (let i = 0; i < byteString.length; i++) {
		intArray[i] = byteString.charCodeAt(i)
	}

	const imageBlob = new Blob([intArray], { type: 'image/png' })
	return new Response(imageBlob, {
		status: 200,
		headers: { 'Content-Type': 'image/png', 'Content-Length': imageBlob.size },
	})
}

/**
 * Busca um recurso e o armazena no cache
 */
const fetchAndCache = async (request, cache) => {
	try {
		const response = await fetch(request)
		if (cache) {
			console.log('Salvando no cache:', request.url)
			cache.put(request, response.clone())
		}
		return response
	} catch (error) {
		console.error('Erro ao buscar recurso:', error)
		return getBlankImageResponse()
	}
}

/**
 * Manipula requisições de imagens
 */
const handleImageRequest = async (event) => {
	const request = event.request

	try {
		const cacheName = await getValidCacheName()
		const cache = await caches.open(cacheName)

		const cachedResponse = await cache.match(request)
		if (cachedResponse) {
			console.log('Cache hit:', request.url)
			return cachedResponse
		}

		console.log('Cache miss:', request.url)
		return fetchAndCache(request, cache)
	} catch (error) {
		console.error('Erro ao manipular requisição de imagem:', error)
		return getBlankImageResponse()
	}
}

// Eventos do Service Worker
self.addEventListener('install', (event) => {
	event.waitUntil(getValidCacheName())
})

self.addEventListener('activate', (event) => {
	event.waitUntil(getValidCacheName())
})

self.addEventListener('fetch', (event) => {
	if (event.request.destination === 'image' || /\.(png|jpg|jpeg|gif|svg|webp|avif|jxl)$/i.test(event.request.url)) {
		event.respondWith(handleImageRequest(event))
	}
})
