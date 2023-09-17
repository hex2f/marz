import { BunFile, Server } from "bun"
import path from "path"
import renderRSC from "./rsc"
import { APIRoute, MatchedRoute, PageRoute, Router } from "./router"
import { Manifest } from "../bundler"
import renderSSR from "./ssr"
import callAPI from "./api"

type Middleware = (req: Request) => Response | undefined

export default function createWorker({
	rscRouter,
	ssrRouter,
	manifest,
	publicDir,
	port,
	middleware = [],
}: {
	rscRouter: Router
	ssrRouter: Router
	manifest: Manifest
	publicDir: string
	port: number
	middleware?: Array<Middleware>
}): Server {
	const fileCache = new Map<string, BunFile>()

	const server = Bun.serve({
		port,
		async fetch(req) {
			const url = new URL(req.url)

			for (const mw of middleware) {
				const res = mw(req)
				if (res) return res
			}

			// TODO: implement a proper router here
			if (url.pathname === "/__marz") {
				const location = url.searchParams.get("location")
				const route = await rscRouter(decodeURIComponent(location ?? "/"))
				if (!route || route.route.route.type !== "page") return new Response("Not found", { status: 404 })

				return renderRSC(url, route as MatchedRoute<PageRoute>, manifest)
			} else {
				const route = await ssrRouter(url.pathname)

				if (!route) {
					const file = fileCache.has(url.pathname)
						? fileCache.get(url.pathname)
						: Bun.file(path.join(publicDir, url.pathname))
					if (file) {
						fileCache.set(url.pathname, file)
						return new Response(file)
					} else {
						return new Response("Not found", { status: 404 })
					}
				}

				switch (route.route.route.type) {
					case "api":
						return callAPI(req, route as MatchedRoute<APIRoute>)
					case "page":
						return renderSSR(url, route as MatchedRoute<PageRoute>, manifest, publicDir)
					default:
						return new Response("Route failed to resolve", { status: 500 })
				}
			}
		},
	})

	return server
}
