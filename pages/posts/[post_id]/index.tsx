import React, { Fragment } from "react"
import { Link } from "../../../framework/client/router"

export async function Page({ params }: { params: { post_id: string } }) {
	return (
		<Fragment>
			<h1>Post #{params.post_id}</h1>
			<Link href={`/posts/${params.post_id}/replies/1`}>Reply #1</Link>
			<br />
			<Link href={`/posts/${params.post_id}/replies/2`}>Reply #2</Link>
		</Fragment>
	)
}
