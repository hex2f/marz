import { Fragment } from "react"
import NavBar from "@/components/navbar"
import { ThemeProvider } from "@/components/theme-provider"

import cssLink from "../main.css"

console.log({ cssLink })

export function Head() {
	return (
		<Fragment>
			<title>Marz</title>
			<link rel="stylesheet" href={cssLink} />
		</Fragment>
	)
}

export function Page() {
	return (
		<ThemeProvider storageKey="marz-theme">
			<NavBar />
		</ThemeProvider>
	)
}
