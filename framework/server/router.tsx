import { readdir } from "fs/promises"
import type React from "react"

export default async function createRouterFromDirectory(
	directory: string,
	options?: { notFoundComponent?: React.JSX.Element; routerIndex?: RouteIndex },
): Promise<(path: string) => Promise<React.JSX.Element | null>> {
	const routes = options?.routerIndex ?? (await recursivelyBuildRouterIndex(directory, {}, []))
	return async (path: string) => {
		const route = routes.routes[path]
		if (!route) {
			return null
		}
		return <route.Page />
	}
}

type Route = { Page: React.FC; Layout?: React.FC }
type RouteIndex = { routes: Record<string, Route>; bundleEntrypoints: string[] }

export async function recursivelyBuildRouterIndex(
	directory: string,
	routes: RouteIndex["routes"] = {},
	path: string[] = [],
	bundleEntrypoints: RouteIndex["bundleEntrypoints"] = [],
): Promise<RouteIndex> {
	const files = await readdir(directory, { withFileTypes: true })
	for (const file of files) {
		if (file.isDirectory()) {
			await recursivelyBuildRouterIndex(`${directory}/${file.name}`, routes, [...path, file.name], bundleEntrypoints)
		} else if (file.isFile()) {
			const fileName = file.name.replace(/\.(js|jsx|ts|tsx)$/, "")
			let routePath = [...path]
			if (fileName !== "index") {
				routePath = [...routePath, fileName]
			}
			const route = (await import(`${directory}/${file.name}`)) as Route
			if ("Page" in route === false) {
				continue
			}
			bundleEntrypoints.push(`${directory}/${file.name}`)
			routes[`/${routePath.join("/")}`] = route
		}
	}
	return { routes, bundleEntrypoints }
}
