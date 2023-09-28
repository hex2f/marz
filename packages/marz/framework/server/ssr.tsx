import path from "path"
import { Manifest } from "../bundler"
import { MatchedRoute, PageRoute, Router } from "./router"
import { renderToReadableStream } from "react-dom/server"
import MarzMount from "./mount"
import React, { StrictMode } from "react"

export default async function renderSSR(
	url: URL,
	route: MatchedRoute<PageRoute>,
	manifest: Manifest,
	publicDir: string,
): Promise<Response> {
	// i... did not think this naming through lmfao
	// also this should probably be moved up to the worker instead of living in ssr
	if (!route.route.route.Page) {
		return new Response("Not found", { status: 404 })
	}

	const params = { ...route.match.groups }

	// TODO: this is really ugly, rethink this
	const clientEntryScript = manifest["client-entry"]?.chunks[0]
	const clientRouterScript = manifest["client-router"]?.chunks[0]

	const mount = (
		<StrictMode>
			<MarzMount
				head={route.route.route.Head ? <route.route.route.Head params={params} /> : <title>Marz</title>}
				clientEntryScript={clientEntryScript}
				clientRouterScript={clientRouterScript}
			>
				<route.route.route.Page params={params} />
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
