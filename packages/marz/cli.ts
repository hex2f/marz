#!/usr/bin/env bun

import arg from "arg"

// @ts-ignore
import { version } from "./package.json"

const args = arg({
	"--help": Boolean,
	"--version": Boolean,

	"-h": "--help",
	"-v": "--version",
})

if (args["--help"]) {
	console.log(`🚀 Marz ${version}\n
Options
  --help, -h    Show this help message
  --version, -v Show the version number

Commands
  dev           Start the development server
  build         Compile the application for production
  start         Start the production server
`)
	process.exit(0)
}

if (args["--version"]) {
	console.log(version)
	process.exit(0)
}

const command = args._[0]

switch (command) {
	case "dev":
		import("./dev")
		break
	case "build":
		import("./build")
		break
	case "start":
		import("./start")
		break
	case undefined:
		console.log(`🚀 Marz ${version}\n\n No command specified. Run \`marz --help\` for usage.`)
		process.exit(1)
		break
	default:
		console.log(`Unknown command: ${command}`)
		process.exit(1)
}
