import { type Dirent } from "fs"
import { readdir } from "fs/promises"
import type React from "react"

export default async function createRouterFromDirectory(
	directory: string,
	options?: { notFoundComponent?: React.JSX.Element; routerIndex?: RouteIndex },
): Promise<(path: string) => Promise<MatchedRoute | undefined>> {
	const routes = options?.routerIndex ?? (await recursivelyBuildRouterIndex(directory))
	const routeCache = new Map<string, MatchedRoute | undefined>()
	return async (path: string) => {
		if (routeCache.has(path)) {
			return routeCache.get(path)
		}

		console.time(`match route: ${path}`)
		const route = matchRoute(path.startsWith("/") ? path.slice(1) : path, routes.regexes)
		console.timeEnd(`match route: ${path}`)

		routeCache.set(path, route)

		return route
	}
}

type Route = {
	Page?: React.FC<{ params: Record<string, string> }>
	Layout?: React.FC<{ params: Record<string, string> }>
}

type RouteNode = {
	route?: Route
	param?: boolean
	children: Record<string, RouteNode>
}

type MatchableRoute = { regex: RegExp; pathLength: number; paramCount: number; route: Route }

type MatchedRoute = { route: MatchableRoute; match: RegExpMatchArray }

type RouteIndex = {
	tree: RouteNode
	regexes: Array<MatchableRoute>
	bundleEntrypoints: string[]
}

export async function recursivelyBuildRouterIndex(
	directory: string,
	regexes: Array<MatchableRoute> = [],
	node: RouteNode = { children: {} },
	currentPath: string[] = [],
	bundleEntrypoints: RouteIndex["bundleEntrypoints"] = [],
	paramCount = 0,
	depth = 0,
): Promise<RouteIndex> {
	if (depth > 10) {
		console.warn("recursivelyBuildRouterIndex: max depth reached, returning early. some routes may not be built")
		return { tree: node, regexes, bundleEntrypoints }
	}

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
		directories.map((dir) => {
			const nextPath = [...currentPath, dir.name]
			const nextNode = node.children[dir.name] ?? { children: {} }
			if (dir.name.match(/^\[(.+)\]$/)) {
				nextNode.param = true
				nextPath[nextPath.length - 1] = `(?<${dir.name.slice(1, -1)}>[^/]+)`
			}
			node.children[dir.name] = nextNode
			return recursivelyBuildRouterIndex(
				`${directory}/${dir.name}`,
				regexes,
				nextNode,
				nextPath,
				bundleEntrypoints,
				nextNode.param ? paramCount + 1 : paramCount,
				depth + 1,
			)
		}),
	)

	// build router index for each file
	await Promise.all(
		files.map(async (file) => {
			const fileName = file.name.replace(/\.(js|jsx|ts|tsx)$/, "")
			const route = (await import(`${directory}/${file.name}`)) as Route
			if ("Page" in route === false) {
				return
			}

			// TODO: Layouts

			if (fileName === "index") {
				node.route = route
				regexes.push({
					regex: new RegExp(`^${currentPath.join("/")}$`),
					pathLength: currentPath.length,
					paramCount,
					route,
				})
			} else if (fileName.match(/^\[(.+)\]$/)) {
				const paramName = fileName.match(/^\[(.+)\]$/)?.[1]
				if (!paramName) {
					throw new Error("invalid param name")
				}
				node.children[paramName] = { route, children: {}, param: true }
				regexes.push({
					regex: new RegExp(`^${[...currentPath, `(?<${fileName.slice(1, -1)}>[^/]+)`].join("/")}$`),
					pathLength: currentPath.length + 1,
					paramCount: paramCount + 1,
					route,
				})
			} else {
				node.children[fileName] = { route, children: {} }
				regexes.push({
					regex: new RegExp(`^${[...currentPath, fileName].join("/")}$`),
					pathLength: currentPath.length + 1,
					paramCount,
					route,
				})
			}

			bundleEntrypoints.push(`${directory}/${file.name}`)
		}),
	)
	return { tree: node, regexes, bundleEntrypoints }
}

function matchRoute(path: string, regexes: Array<MatchableRoute>): MatchedRoute | undefined {
	const pathLength = path.split("/").filter((p) => p !== "").length
	const viable = regexes
		.filter((r) => r.pathLength === pathLength) // only match routes with the same number of path segments
		.sort((a, b) => a.paramCount - b.paramCount) // try to match routes with the least params first

	for (const route of viable) {
		const match = route.regex.exec(path)
		if (match) {
			return { route, match }
		}
	}
}
