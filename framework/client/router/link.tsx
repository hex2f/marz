"use client"

import React, { PropsWithChildren } from "react"
import { useRouter } from "./useRouter"

export default function Link({ children, href }: PropsWithChildren<{ href: string }>) {
	const { navigate } = useRouter()
	return (
		// biome-ignore lint/a11y/useValidAnchor: this is a progrssive enhancement link, if JS is enabled it will navigate without reloading the page by fetching and applying an RSC bundle. Otherwise it will navigate by reloading the page.
		<a
			href={href}
			onClick={(e) => {
				e.preventDefault()
				navigate(href)
			}}
		>
			{children}
		</a>
	)
}
