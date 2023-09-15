import React, { Fragment } from "react"

export async function Page({ params }: { params: { post_id: string } }) {
	return (
		<Fragment>
			<h1>Post #{params.post_id} -&gt; Reply is overridden</h1>
		</Fragment>
	)
}
