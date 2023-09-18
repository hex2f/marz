export async function GET(req: Request, params: never) {
	return new Response(JSON.stringify({ time: new Date().toISOString() }))
}
