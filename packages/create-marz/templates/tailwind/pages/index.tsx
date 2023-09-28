import { Fragment } from "react"
import Timer from "@/components/timer"

import mainCss from "../main.css"

export function Head() {
	return (
		<Fragment>
			<title>Marz App</title>
			<link rel="stylesheet" href={mainCss} />
		</Fragment>
	)
}

export function Page() {
	return (
		<Fragment>
			<h1>Next stop: Marz</h1>
			<p>
				You've been on this page for: <Timer />
			</p>
		</Fragment>
	)
}
