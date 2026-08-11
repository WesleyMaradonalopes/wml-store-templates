import { useCallback, useRef } from 'react'

/**
 * Creates a debounced version of a callback function.
 * The debounced function will only execute after the specified delay
 * has passed since the last invocation.
 *
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {Function} Debounced callback
 *
 * @example
 * const handleClick = useDebounceCallback(() => { ... }, 500)
 * <Button onClick={handleClick} />
 */
export default function useDebounceCallback(callback, delay = 300) {
	const timeoutRef = useRef(null)

	return useCallback(
		(...args) => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current)
			}

			timeoutRef.current = setTimeout(() => {
				timeoutRef.current = null
				callback(...args)
			}, delay)
		},
		[callback, delay],
	)
}
