import React, { Fragment } from "react"
import { Link } from "../../framework/client/router"

export async function Page() {
	return (
		<Fragment>
			<h1>Posts</h1>
			<Link href="/posts/1">Post #1</Link>
			<br />
			<Link href="/posts/2">Post #2</Link>
			<br />
			<Link href="/posts/3">Post #3</Link>
		</Fragment>
	)
}
