"use client"

import React from "react"

export default function Ticker() {
	const [count, setCount] = React.useState(0)

	React.useEffect(() => {
		setCount((count) => count + 1)
		const interval = setInterval(() => {
			setCount((count) => count + 1)
		}, 1000)

		return () => clearInterval(interval)
	}, [])

	return <span>{count > 0 ? count : "..."}</span>
}
