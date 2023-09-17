import stream from "stream"
import { Manifest } from "../bundler"
import { MatchedRoute, PageRoute, Router } from "./router"
// @ts-expect-error - doesnt have any types, at least that i could find
import { renderToPipeableStream } from "react-server-dom-webpack/server.node"

export default async function renderRSC(
	url: URL,
	route: MatchedRoute<PageRoute>,
	manifest: Manifest,
): Promise<Response> {
	// console.time(`RSC start stream ${location}`)

	// i... did not think this naming through lmfao
	if (!route.route.route.Page) throw new Error("Route not found")

	const params = { ...route.match.groups }
	const rsc = await renderToPipeableStream(<route.route.route.Page params={params} />, manifest)

	// console.timeEnd(`RSC start stream ${location}`)

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
}
