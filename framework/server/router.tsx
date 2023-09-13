import { type Dirent } from "fs"
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
	const dirRes = await readdir(directory, { withFileTypes: true })

	// split into files and directories arrays
	const [files, directories] = dirRes.reduce(
		([files, directories], file) => {
			if (file.isDirectory()) {
				directories.push(file)
			} else if (file.isFile()) {
				files.push(file)
			}
			return [files, directories]
		},
		[[], []] as [Dirent[], Dirent[]],
	)

	// recursively build router index for each directory
	await Promise.all(
		directories.map((dir) =>
			recursivelyBuildRouterIndex(`${directory}/${dir.name}`, routes, [...path, dir.name], bundleEntrypoints),
		),
	)

	// build router index for each file
	await Promise.all(
		files.map(async (file) => {
			const fileName = file.name.replace(/\.(js|jsx|ts|tsx)$/, "")
			let routePath = [...path]
			if (fileName !== "index") {
				routePath = [...routePath, fileName]
			}
			const route = (await import(`${directory}/${file.name}`)) as Route
			if ("Page" in route === false) {
				return
			}
			bundleEntrypoints.push(`${directory}/${file.name}`)
			routes[`/${routePath.join("/")}`] = route
		}),
	)
	return { routes, bundleEntrypoints }
}
