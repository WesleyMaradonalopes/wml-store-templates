import { useCallback, useRef } from 'react'

/**
 * Creates a throttled version of a callback function.
 * The throttled function executes immediately on first call,
 * then ignores subsequent calls until the delay period has elapsed.
 *
 * @param {Function} callback - The function to throttle
 * @param {number} delay - Delay in milliseconds (default: 300)
 * @returns {Function} Throttled callback
 *
 * @example
 * const handleClick = useThrottleCallback(() => { ... }, 500)
 * <Button onClick={handleClick} />
 */
export default function useThrottleCallback(callback, delay = 300) {
	const timeoutRef = useRef(null)

	return useCallback(
		(...args) => {
			if (timeoutRef.current) return

			timeoutRef.current = setTimeout(() => {
				timeoutRef.current = null
			}, delay)

			callback(...args)
		},
		[callback, delay],
	)
}
