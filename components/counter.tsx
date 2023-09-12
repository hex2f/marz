"use client"

import React from "react"

export default function Counter() {
	const [count, setCount] = React.useState(0)

	return (
		<button type="button" onClick={() => setCount(count + 1)}>
			{count}
		</button>
	)
}
