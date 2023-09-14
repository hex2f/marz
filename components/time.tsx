export async function Time() {
	return <span>{new Date().toISOString()}</span>
}
