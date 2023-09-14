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
				const html = await renderToPipeableStream(route, manifest)

				console.timeEnd(`RSC start stream ${location}`)

				// Convert node stream to web stream, adds a bit of overhead but its Fine :tm:
				const htmlStream = new ReadableStream({
					start(controller) {
						html.pipe(
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

				return new Response(htmlStream, {
					headers: {
						"Content-Type": "application/json",
					},
				})
			} else {
				// SSR
				const route = await ssrRouter(url.pathname)
				if (route == null) {
					const file = Bun.file(path.join(publicDir, url.pathname))
					if (file) {
						return new Response(file)
					}
					return new Response("Not found", { status: 404 })
				}
				const mount = <MarzMount>{route}</MarzMount>
				const html = await renderToReadableStream(mount)
				return new Response(html, {
					headers: {
						"Content-Type": "text/html",
					},
				})
			}
		},
	})
}
