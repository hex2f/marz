import { Fragment } from "react"
import NavBar from "@/components/navbar"
import { ThemeProvider } from "@/components/theme-provider"

export function Page() {
	return (
		<ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
			<NavBar />
		</ThemeProvider>
	)
}
