#!/usr/bin/env bun

import arg from "arg"

const args = arg({
	"--help": Boolean,
	"--pages-dir": String,
	"--public-dir": String,
	"--out-dir": String,
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
  --port       <port> Default: 3000

Examples
  $ marz dev
  $ marz dev --pages-dir ./src/pages --public-dir ./src/public --out-dir .marz --port 3001
`)
	process.exit(0)
}

import createRouterFromDirectory, { recursivelyBuildRouterIndex } from "./framework/server/router"

import path from "path"
import { bundle } from "./framework/bundler"
import createWorker from "./framework/server/worker"
import { watch } from "fs"
import { Server } from "bun"

let worker: Server | undefined = undefined

const outDir = path.resolve(args["--out-dir"] || ".marz")
const ssrPagesDir = path.resolve(args["--pages-dir"] || "./pages")
const rscPagesDir = path.resolve(path.join(outDir, "server/routes"))

async function buildAndStartWorker() {
	if (worker) {
		worker.stop()
	}
	console.time("total - compile marz app")

	console.time("create ssr router index")
	const ssrRouterIndex = await recursivelyBuildRouterIndex(ssrPagesDir)
	console.timeEnd("create ssr router index")

	const { manifest } = await bundle(ssrRouterIndex.bundleEntrypoints, {
		outDir,
		publicDir: path.resolve(args["--public-dir"] || "./public"),
	})

	console.time("create rsc router index")
	const rscRouterIndex = await recursivelyBuildRouterIndex(rscPagesDir)
	console.timeEnd("create rsc router index")

	console.time("reconcile routes")
	const ssrRouter = await createRouterFromDirectory(ssrPagesDir, { routerIndex: ssrRouterIndex })
	const rscRouter = await createRouterFromDirectory(rscPagesDir, { routerIndex: rscRouterIndex })
	console.timeEnd("reconcile routes")

	console.timeEnd("total - compile marz app")

	console.time("create worker")
	worker = await createWorker({
		rscRouter,
		ssrRouter,
		manifest,
		publicDir: path.resolve(path.join(outDir, "client")),
		port: args["--port"] || 3000,
	})
	console.timeEnd("create worker")
	console.log("🚀 running")
}

watch(".", { recursive: true }, async (event, filename) => {
	if (event !== "change") return

	if (path.resolve(filename as string).startsWith(outDir)) return
	console.log(`\n📂 Change detected - ${filename}`)
	console.log("🛠️ Rebuilding...")
	await buildAndStartWorker()
})

await buildAndStartWorker()
