import React, { Fragment, Suspense } from "react"
import Counter from "../components/counter"
import { Link } from "../framework/client/router"
import { Delayed } from "../components/delayed"
import { Time } from "../components/time"

export async function Page() {
	const timeBeforeSleep = new Date()
	await new Promise((resolve) => setTimeout(resolve, 100))
	const timeAfterSleep = new Date()
	return (
		<Fragment>
			<h1>Hello world!</h1>
			<p>Time before sleep: {timeBeforeSleep.toTimeString()}</p>
			<p>Time after sleep: {timeAfterSleep.toTimeString()}</p>
			<Counter />
			<br />
			<Suspense fallback={<p>Suspense loading...</p>}>
				<Delayed delay={1000} Component={Time} />
			</Suspense>
			<Link href="/subdir">go to /subdir</Link>
		</Fragment>
	)
}
