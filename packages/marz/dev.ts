#!/usr/bin/env bun

import arg from "arg"
import child_process from "child_process"

const args = arg({
	"--help": Boolean,
	"--pages-dir": String,
	"--public-dir": String,
	"--out-dir": String,
	"--postcss": String,
	"--port": Number,

	"-h": "--help",
})

if (args["--help"]) {
	console.log(`
Options
  --help, -h    Show this help message

  --pages-dir  <path> Default: ./pages
  --public-dir <path> Default: ./public
  --out-dir    <path> Default: .marz
  --postcss    <path> Default: ./postcss.config.js
  --port       <port> Default: 3000

Examples
  $ marz dev
  $ marz dev --pages-dir ./src/pages --public-dir ./src/public --out-dir .marz --port 3001
`)
	process.exit(0)
}

import path from "path"
import { watch } from "fs"

const outDir = path.resolve(args["--out-dir"] || ".marz")

let child: child_process.ChildProcess | undefined

//             hm.. not the best name 😅
async function startChildWorker() {
	if (child) {
		child.kill()
	}

	child = child_process.spawn("bun", ["run", path.join(import.meta.dir, "dev-worker.ts")], {
		stdio: "inherit",
		env: {
			...process.env,
			MARZ_DEV: "true",
		},
	})

	child.on("close", () => {
		child = undefined
	})
}

watch(".", { recursive: true }, async (event, filename) => {
	if (event !== "change") return
	if (path.resolve(filename as string).startsWith(outDir)) return

	console.log(`\n📂 Change detected - ${filename}`)
	console.log("🛠️ Rebuilding...")
	await startChildWorker()
})

await startChildWorker()
