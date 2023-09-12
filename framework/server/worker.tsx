// @ts-expect-error - doesnt have any types, at least that i could find
import { renderToPipeableStream } from "react-server-dom-webpack/server.node"
import { renderToReadableStream } from "react-dom/server"
import path from "path"
import stream from "stream"
import MarzMount from "./mount"

export default async function createWorker({
	rscRouter,
	ssrRouter,
	manifest,
	publicDir
}: {
	rscRouter: (route: string) => Promise<JSX.Element|null>
	ssrRouter: (route: string) => Promise<JSX.Element|null>
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

				console.time(`RSC render ${location}`)

				const route = await rscRouter(decodeURIComponent(location ?? "/"))
				const html = await renderToPipeableStream(route, manifest)
				const writer = new stream.PassThrough()
				
				// TODO: figure out how to convert this to a ReadableStream properly cause this is so ugly lol
				const htmlStr = (await new Promise((res) => {
					let string = ""
					writer.on("data", function (data) {
						string += data.toString()
					})
					writer.on("end", function () {
						res(string)
					})
					html.pipe(writer)
				})) as string

				console.timeEnd(`RSC render ${location}`)

				return new Response(htmlStr, {
					headers: {
						"Content-Type": "application/json"
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
				const html = await renderToReadableStream(mount, manifest)
				return new Response(html, {
					headers: {
						"Content-Type": "text/html",
					},
				})
			}
		},
	})
}
