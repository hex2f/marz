import React, { Fragment } from "react"
import { Link } from "../../../../framework/client/router"

export async function Page({ params }: { params: { post_id: string; reply_id: string } }) {
	return (
		<Fragment>
			<h1>
				Post #{params.post_id} -&gt; Reply #{params.reply_id}
			</h1>
			<code>{JSON.stringify(params)}</code>
			<br />
			<Link href={`/posts/${params.post_id}`}>Back to Post #{params.post_id}</Link>
		</Fragment>
	)
}
