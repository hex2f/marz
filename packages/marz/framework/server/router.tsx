import { match } from "assert"
import { type Dirent } from "fs"
import { readdir } from "fs/promises"
import type React from "react"

export default async function createRouterFromDirectory(
	directory: string,
	options?: { notFoundComponent?: React.JSX.Element; routerIndex?: RouteIndex },
): Promise<(path: string) => Promise<MatchedRoute<Route> | undefined>> {
	const routes = options?.routerIndex ?? (await recursivelyBuildRouterIndex(directory))
	const routeCache = new Map<string, MatchedRoute<Route> | undefined>()
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

// biome-ignore lint/suspicious/noExplicitAny: trust me typescript, this is for your own good.
type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R> ? R : any
export type Router = AsyncReturnType<typeof createRouterFromDirectory>

export type PageRoute = {
	type: "page"
	file: string
	Head?: React.FC<{ params: Record<string, string> }>
	Page?: React.FC<{ params: Record<string, string> }>
	Layout?: React.FC<{ params: Record<string, string> }>
}

type APIRouteHandler = (req: Request, params: Record<string, string>) => Promise<Response | undefined>

export type APIRoute = {
	type: "api"
	file: string
	GET?: APIRouteHandler
	POST?: APIRouteHandler
	PUT?: APIRouteHandler
	PATCH?: APIRouteHandler
	DELETE?: APIRouteHandler
}

export type NoneRoute = { type: "none"; file: string }

export type Route = APIRoute | PageRoute | NoneRoute

export type RouteNode = {
	route?: Route
	param?: boolean
	children: Record<string, RouteNode>
}

export type MatchableRoute<T extends Route> = { regex: RegExp; pathLength: number; paramCount: number; route: T }

export type MatchedRoute<T extends Route> = { route: MatchableRoute<T>; match: RegExpMatchArray }

type RouteIndex = {
	tree: RouteNode
	regexes: Array<MatchableRoute<Route>>
	bundleEntrypoints: string[]
}

export async function recursivelyBuildRouterIndex(
	directory: string,
	regexes: Array<MatchableRoute<Route>> = [],
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
			const route = { type: "none", file: `${directory}/${file.name}` } as Route

			// TODO: Layouts

			if (fileName === "index") {
				// node.route = routeExports
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

function matchRoute(path: string, regexes: Array<MatchableRoute<Route>>): MatchedRoute<Route> | undefined {
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

export async function hydrateMatchableRoutesImports(regexes: Array<MatchableRoute<Route>>) {
	await Promise.all(
		regexes.map(async (matchable) => {
			const hydratedMatchable = matchable
			if (matchable.route.type !== "none") return matchable
			const routeExports = (await import(matchable.route.file)) as Route

			if ("Page" in routeExports || "Layout" in routeExports) {
				hydratedMatchable.route = {
					type: "page",
					file: hydratedMatchable.route.file,
					Head: routeExports.Head,
					Page: routeExports.Page,
					Layout: routeExports.Layout,
				}
			}

			if (
				"GET" in routeExports ||
				"POST" in routeExports ||
				"PUT" in routeExports ||
				"PATCH" in routeExports ||
				"DELETE" in routeExports
			) {
				if (hydratedMatchable.route.type === "page") {
					throw new Error(
						`A page cannot be both a page and an API route.\n      in ${hydratedMatchable.route.file ?? "unknown"}`,
					)
				}
				hydratedMatchable.route = { ...routeExports, type: "api" }
			}
		}),
	)
}
