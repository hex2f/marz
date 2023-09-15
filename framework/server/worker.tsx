import path from "path"
import stream from "stream"
import { renderToReadableStream } from "react-dom/server"
// @ts-expect-error - doesnt have any types, at least that i could find
import { renderToPipeableStream } from "react-server-dom-webpack/server.node"
import MarzMount from "./mount"
import type createRouterFromDirectory from "./router"
import { StrictMode } from "react"

// biome-ignore lint/suspicious/noExplicitAny: trust me typescript, this is for your own good.
type AsyncReturnType<T extends (...args: any) => Promise<any>> = T extends (...args: any) => Promise<infer R> ? R : any

export default async function createWorker({
	rscRouter,
	ssrRouter,
	manifest,
	publicDir,
}: {
	rscRouter: AsyncReturnType<typeof createRouterFromDirectory>
	ssrRouter: AsyncReturnType<typeof createRouterFromDirectory>
	manifest: Record<string, object>
	publicDir: string
}) {
	Bun.serve({
		port: 3000,
		async fetch(req) {
			const url = new URL(req.url)

			// TODO: implement a proper router here

			if (url.pathname === "/favicon.ico") {
				return new Response(null, { status: 404 })
			}

			if (url.pathname === "/__marz") {
				// RSC
				const location = url.searchParams.get("location")

				console.time(`RSC start stream ${location}`)

				const route = await rscRouter(decodeURIComponent(location ?? "/"))
				// i... did not think this naming through lmfao
				if (!route?.route.route.Page) throw new Error("Route not found")
				const params = { ...route.match.groups }
				const rsc = await renderToPipeableStream(<route.route.route.Page params={params} />, manifest)

				console.timeEnd(`RSC start stream ${location}`)

				// Convert node stream to web stream, adds a bit of overhead but its Fine :tm:
				const rscStream = new ReadableStream({
					start(controller) {
						rsc.pipe(
							new stream.Writable({
								write(chunk, encoding, callback) {
									controller.enqueue(chunk)
									callback()
								},
								destroy(error, callback) {
									if (error) {
										controller.error(error)
									} else {
										controller.close()
									}
									callback(error)
								},
							}),
						)
					},
				})

				return new Response(rscStream, {
					headers: {
						"Content-Type": "application/json",
					},
				})
			} else {
				// SSR
				const ssrRoute = await ssrRouter(url.pathname)
				// i... did not think this naming through lmfao
				if (!ssrRoute?.route.route.Page) {
					const file = Bun.file(path.join(publicDir, url.pathname))
					if (file) {
						return new Response(file)
					}
					return new Response("Not found", { status: 404 })
				}

				const params = { ...ssrRoute.match.groups }

				const mount = (
					<StrictMode>
						<MarzMount>
							<ssrRoute.route.route.Page params={params} />
						</MarzMount>
					</StrictMode>
				)

				// TODO: this is a temporary hack to only render a single "frame"
				const abortController = new AbortController()
				const ssr = await renderToReadableStream(mount, { signal: abortController.signal, onError() {} })
				abortController.abort()

				return new Response(ssr, {
					headers: {
						"Content-Type": "text/html",
					},
				})
			}
		},
	})
}
