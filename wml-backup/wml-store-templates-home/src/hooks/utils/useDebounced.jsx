import { useState } from 'react'

export default function useDebounced(callback, delay = 500) {
	const [timeoutId, setTimeoutId] = useState(null)

	return (...args) => {
		clearTimeout(timeoutId)

		setTimeoutId(
			setTimeout(() => {
				callback(...args)
			}, delay),
		)
	}
}
