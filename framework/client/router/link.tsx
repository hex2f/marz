"use client";

import React, { PropsWithChildren } from "react"
import { useRouter } from "./useRouter";

export default function Link ({ children, href }: PropsWithChildren<{ href: string }>) {
	const { navigate } = useRouter()
	return (
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