import { Fragment } from "react"
import Timer from "@/components/timer"
import { Link } from "marz/framework/client/router"

export function Page() {
	return (
		<Fragment>
			<h1>Next stop: Marz</h1>
			<p>
				You've been on this page for: <Timer />
			</p>
			<Link href="/">About</Link>
		</Fragment>
	)
}
