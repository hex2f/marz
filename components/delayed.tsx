import React from "react"

export async function Delayed({ delay = 1000, Component }: { delay: number; Component: React.ComponentType }) {
	await new Promise((resolve) => setTimeout(resolve, delay))
	return <Component />
}
