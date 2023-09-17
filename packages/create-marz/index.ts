#!/usr/bin/env bun

import arg from "arg"
import prompts from "prompts"
import fs from "fs"
import path from "path"
import child_process from "child_process"

// @ts-ignore
import { version } from "./package.json"

const availableTemplates = {
	barebones: {
		name: "Barebones",
		description: "A barebones Marz app with no other dependencies.",
	},
	// "tailwind": {
	// 	name: "Tailwind",
	// 	description: "A Marz app with Tailwind CSS.",
	// },
	// "shadcn": {
	// 	name: "shadcn/ui",
	// 	description: "A Marz app with shadcn/ui and Tailwind set up.",
	// },
}

const args = arg({
	"--help": Boolean,
	"--version": Boolean,
	"--template": String,
	"--name": String,
	"--overwrite": Boolean,
	"--install": Boolean,

	"-h": "--help",
	"-v": "--version",
	"-t": "--template",
	"-n": "--name",
	"-i": "--install",
})

if (args["--help"]) {
	console.log(`🚀 create-marz ${version}\n
Options
  --help, -h     Show this help message
  --version, -v  Show the version number
  --template, -t Template to use
  --name, -n     Name of the app
  --overwrite    Overwrite existing directory
  --install, -i  Install dependencies

Examples
  $ create-marz my-app
  $ create-marz my-app --template template-barebones
  $ create-marz my-app --template template-barebones --install --overwrite
`)
	process.exit(0)
}

if (args["--version"]) {
	console.log(version)
	process.exit(0)
}

console.log(`🚀 create-marz ${version}`)

let appName = args["--name"] ?? args._[0]
if (!appName) {
	const res = await prompts({
		type: "text",
		name: "appName",
		message: "What is the name of your app?",
		initial: "marz-app",
	})

	appName = res.appName
}

if (!appName || !appName.match(/^[a-zA-Z0-9_-]+$/)) {
	process.exit(0)
}

if (!appName.match(/^[a-zA-Z0-9_-]+$/)) {
	console.log(`\n🚨 Invalid app name: ${appName}`)
	process.exit(1)
}

let template = args["--template"] ?? args._[1]
if (!template) {
	const res = await prompts({
		type: "select",
		name: "template",
		message: "Which template would you like to use?",
		choices: Object.entries(availableTemplates).map(([key, template]) => ({
			title: template.name,
			value: key,
			description: template.description,
		})),
	})

	template = res.template
} else {
	if (template in availableTemplates === false) {
		console.log(`Unknown template: ${template}`)
		process.exit(1)
	}
}

if (!template) {
	process.exit(0)
}

const templateInfo = availableTemplates[template as keyof typeof availableTemplates]
console.log(`🌑 Creating a new Marz app in ${appName} using the ${templateInfo.name} template...`)

const cwd = process.cwd()
const appDir = path.join(cwd, appName)

if (await fs.promises.exists(appDir)) {
	if (!args["--overwrite"]) {
		console.log(`\n🚨 The directory ${appName} already exists. Use --overwrite to ignore.`)
		process.exit(1)
	} else {
		console.log(`\n🚨 The directory ${appName} already exists. Overwriting...`)
		await fs.promises.rm(appDir, { recursive: true })
	}
}

await fs.promises.mkdir(appDir)

const templateDir = path.join(import.meta.dir, "templates", template)

try {
	await fs.promises.cp(templateDir, appDir, { recursive: true })
} catch (e) {
	console.log("\n🚨 Failed to copy template files.")
	process.exit(1)
}

if (args["--install"]) {
	console.log("\n📦 Installing dependencies...")
	try {
		child_process.execSync("bun install", { cwd: appDir, stdio: "inherit" })
	} catch (e) {
		console.log("\n🚨 Failed to install dependencies.")
		process.exit(1)
	}
}

const astronauts = ["👩🏻‍🚀", "👩🏼‍🚀", "👩🏽‍🚀", "👩🏾‍🚀", "👩🏾‍🚀", "👨🏻‍🚀", "👨🏼‍🚀", "👨🏽‍🚀", "👨🏾‍🚀", "👨🏿‍🚀"]

console.log(`\n🚀 Touchdown! We have landed on Marz ${astronauts[Math.floor(Math.random() * astronauts.length)]}

To get started, run:
  cd ${appName}
  bun install
  bun dev
`)
