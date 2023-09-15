import React, { Fragment, Suspense } from "react"
import Counter from "../components/counter"
import { Time } from "../components/time"
import { Link } from "../framework/client/router"

export async function Page() {
	return (
		<Fragment>
			<Counter />
			<h1>Hello world!</h1>
			<p>
				Rendered at: <Time />
			</p>
			<br />
			<br />
			<Link href="/suspense">Go to suspense demo</Link>
			<br />
			<Link href="/posts">/posts</Link>
		</Fragment>
	)
}
