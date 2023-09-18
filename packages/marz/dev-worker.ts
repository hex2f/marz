import path from "path"
import arg from "arg"

import createRouterFromDirectory, { recursivelyBuildRouterIndex } from "./framework/server/router"

import { bundle } from "./framework/bundler"
import createWorker from "./framework/server/worker"

const args = arg({
	"--help": Boolean,
	"--pages-dir": String,
	"--public-dir": String,
	"--out-dir": String,
	"--port": Number,

	"-h": "--help",
})

const outDir = path.resolve(args["--out-dir"] || ".marz")
const ssrPagesDir = path.resolve(args["--pages-dir"] || "./pages")
const rscPagesDir = path.resolve(path.join(outDir, "server/routes"))

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
await createWorker({
	rscRouter,
	ssrRouter,
	manifest,
	publicDir: path.resolve(path.join(outDir, "client")),
	port: args["--port"] || 3000,
})
console.timeEnd("create worker")
console.log("🚀 running")
