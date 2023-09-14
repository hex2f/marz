import React, { Fragment, Suspense } from "react"
import Counter from "../components/counter"
import { Delayed } from "../components/delayed"
import { Time } from "../components/time"
import Ticker from "../components/ticker"
import { Link } from "../framework/client/router"

export async function Page() {
	return (
		<Fragment>
			<Counter />
			<h1>The suspense is killing me...</h1>
			<br />
			<Ticker />
			<Suspense fallback={<p>Suspense loading...</p>}>
				<p>
					<Delayed delay={1000} Component={Time} />
				</p>
			</Suspense>
			<br />
			<br />
			<Link href="/">Go back home</Link>
		</Fragment>
	)
}
