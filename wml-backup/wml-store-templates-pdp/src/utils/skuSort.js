const baseOrder = {
	PP: 1,
	P: 2,
	M: 3,
	G: 4,
	GG: 5,
	XG: 6,
	EG: 7
}

function getOrder(size) {
	const s = size.toString().trim().toUpperCase()

	// Tamanhos padrão (PP, P, M, G, GG...)
	if (baseOrder[s]) return baseOrder[s]

	// G1, G2, G3...
	const matchG = s.match(/^G(\d+)$/)
	if (matchG) return 10 + parseInt(matchG[1])

	// Tamanhos pequenos (1, 2, 3, 4, 5) — ex: calçados infantis ou numeração própria
	const num = parseInt(s)
	if (/^\d+$/.test(s) && num <= 20) return 50 + num

	// Números adultos (34, 36, 38, ...)
	if (/^\d+$/.test(s)) return 100 + num

	// Infantil: ex "6M" (meses), "10A" (anos)
	const matchKids = s.match(/^(\d+)(M|A)?$/)
	if (matchKids) {
		const kNum = parseInt(matchKids[1])
		if (s.includes('M')) return 200 + kNum
		if (s.includes('A')) return 220 + kNum
		return 240 + kNum
	}

	// fallback: alfabético
	return 9999 + s.charCodeAt(0)
}

export const sortSku = values => {
	try {
		return values?.sort((a, b) => getOrder(a.name) - getOrder(b.name))
	} catch (e) {
		return values
	}
}
