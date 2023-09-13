"use client"

import React, {
	type PropsWithChildren,
	startTransition,
	// @ts-expect-error - no typings for "use" yet
	use,
	useContext,
	useEffect,
	useState,
	createContext,
} from "react"
// @ts-expect-error - no typings yet
import { createFromFetch } from "react-server-dom-webpack/client.browser"

const initialCache = new Map()

export const RouterContext = createContext<{
	location: string
	refresh: (response: Response) => void
	navigate: (nextLocation: string) => void
}>({ location: "", refresh: () => {}, navigate: () => {} })

export default function Router() {
	const [cache, setCache] = useState(initialCache)
	const [location, setLocation] = useState(window.location.pathname)

	let content = cache.get(location)
	if (!content) {
		content = createFromFetch(fetch(`/__marz?location=${encodeURIComponent(location)}`))
		cache.set(location, content)
	}

	function refresh(response: Response) {
		// startTransition(() => {
		// 	const nextCache = new Map()
		// 	if (response != null) {
		// 		const locationKey = response.headers.get("X-Location") ?? "{}"
		// 		const nextLocation = JSON.parse(locationKey)
		// 		const nextContent = createFromReadableStream(response.body)
		// 		nextCache.set(locationKey, nextContent)
		// 		navigate(nextLocation)
		// 	}
		// 	setCache(nextCache)
		// })
	}

	function navigate(nextLocation: string) {
		console.log("navigate", nextLocation)
		window.history.pushState(null, "", nextLocation)
		startTransition(() => {
			setLocation(nextLocation)
		})
	}

	useEffect(() => {
		function handlePopState(e: PopStateEvent) {
			startTransition(() => {
				setLocation(window.location.pathname)
			})
		}
		window.addEventListener("popstate", handlePopState)
		return () => window.removeEventListener("popstate", handlePopState)
	}, [])

	return <RouterContext.Provider value={{ location, navigate, refresh }}>{use(content)}</RouterContext.Provider>
}

export function useRouter() {
	return useContext(RouterContext)
}

export function Link({ children, href }: PropsWithChildren<{ href: string }>) {
	const { navigate } = useRouter()
	return (
		// biome-ignore lint/a11y/useValidAnchor: this is a progrssive enhancement link, if JS is enabled it will navigate without reloading the page by fetching and applying an RSC bundle. Otherwise it will navigate by reloading the page.
		<a
			href={href}
			onClick={(e) => {
				e.preventDefault()
				navigate(href)
			}}
		>
			{children}
		</a>
	)
}

// export function useMutation({ endpoint, method }: { endpoint: string; method: "POST" | "PUT" | "PATCH" }}) {
// 	const { refresh } = useRouter()
// 	const [isSaving, setIsSaving] = useState(false)
// 	const [didError, setDidError] = useState(false)
// 	const [error, setError] = useState(null)
// 	if (didError) {
// 		// Let the nearest error boundary handle errors while saving.
// 		throw error
// 	}

// 	async function performMutation(payload: any) {
// 		setIsSaving(true)
// 		try {
// 			const response = await fetch(`${endpoint}`, {
// 				method,
// 				body: JSON.stringify(payload),
// 				headers: {
// 					"Content-Type": "application/json",
// 				},
// 			})
// 			if (!response.ok) {
// 				throw new Error(await response.text())
// 			}
// 			refresh(response)
// 		} catch (e) {
// 			setDidError(true)
// 			setError(e)
// 		} finally {
// 			setIsSaving(false)
// 		}
// 	}

// 	return [isSaving, performMutation]
// }
