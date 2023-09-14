import path from "path"
import stream from "stream"
import { renderToReadableStream } from "react-dom/server"
// @ts-expect-error - doesnt have any types, at least that i could find
import { renderToPipeableStream } from "react-server-dom-webpack/server.node"
import MarzMount from "./mount"

export default async function createWorker({
	rscRouter,
	ssrRouter,
	manifest,
	publicDir,
}: {
	rscRouter: (route: string) => Promise<JSX.Element | null>
	ssrRouter: (route: string) => Promise<JSX.Element | null>
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
				const rsc = await renderToPipeableStream(route, manifest)

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
				if (ssrRoute == null) {
					const file = Bun.file(path.join(publicDir, url.pathname))
					if (file) {
						return new Response(file)
					}
					return new Response("Not found", { status: 404 })
				}

				const mount = <MarzMount>{ssrRoute}</MarzMount>

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
