import React from "react"
import { Link } from "marz/framework/client/router"
import { ThemeToggle } from "./theme-toggle"

export default function NavBar() {
	return (
		<nav className="border-b border-b-gray-200 py-4">
			<div className="max-w-7xl mx-auto flex">
				<div className="flex gap-2 items-center">
					<img src="/marz.svg" alt="Marz" className="h-5" />
				</div>

				<div className="flex gap-4 ml-8 font-inter text-sm font-medium">
					<Link href="/getting-started">Getting Started</Link>
					<Link href="/docs">Docs</Link>
					<Link href="/changelog">Changelog</Link>
				</div>

				<ThemeToggle />
			</div>
		</nav>
	)
}
