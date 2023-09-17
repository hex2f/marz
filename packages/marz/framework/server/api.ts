import { APIRoute, MatchedRoute } from "./router"

export default async function callAPI(request: Request, route: MatchedRoute<APIRoute>): Promise<Response> {
	const params = { ...route.match.groups }
	// route.route.route.route.route.route.route.route.route.route.route.route
	// lol 😭
	switch (request.method) {
		case "GET":
			return (await route.route.route.GET?.(request, params)) ?? new Response("Method not allowed", { status: 405 })
		case "POST":
			return (await route.route.route.POST?.(request, params)) ?? new Response("Method not allowed", { status: 405 })
		case "PUT":
			return (await route.route.route.PUT?.(request, params)) ?? new Response("Method not allowed", { status: 405 })
		case "PATCH":
			return (await route.route.route.PATCH?.(request, params)) ?? new Response("Method not allowed", { status: 405 })
		case "DELETE":
			return (await route.route.route.DELETE?.(request, params)) ?? new Response("Method not allowed", { status: 405 })
		default:
			return new Response("Method not allowed", { status: 405 })
	}
}
