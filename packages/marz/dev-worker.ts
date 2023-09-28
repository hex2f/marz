import path from "path"
import arg from "arg"
import fs from "fs/promises"
import type Postcss from "postcss"

import createRouterFromDirectory, {
	hydrateMatchableRoutesImports,
	recursivelyBuildRouterIndex,
} from "./framework/server/router"

import { bundle } from "./framework/bundler"
import createWorker from "./framework/server/worker"
import cssBundlePlugin from "./framework/css-bundle-plugin"

const args = arg({
	"--help": Boolean,
	"--pages-dir": String,
	"--public-dir": String,
	"--out-dir": String,
	"--port": Number,
	"--postcss": String,

	"-h": "--help",
})

const outDir = path.resolve(args["--out-dir"] || ".marz")
const ssrPagesDir = path.resolve(args["--pages-dir"] || "./pages")
const rscPagesDir = path.resolve(path.join(outDir, "server/routes"))
const postcssConfigPath = path.resolve(args["--postcss"] || "./postcss.config.js")
let postcssConfig = { plugins: [] } as { plugins: Postcss.AcceptedPlugin[] }
if (await fs.exists(postcssConfigPath)) {
	console.time("load postcss config")
	postcssConfig = require(postcssConfigPath)
	postcssConfig.plugins = Object.entries(postcssConfig.plugins).map(([name, options]) => {
		const plugin = require(name)
		return plugin(options)
	})
	console.timeEnd("load postcss config")
}

console.time("total - compile marz app")

console.time("create ssr router index")
const ssrRouterIndex = await recursivelyBuildRouterIndex(ssrPagesDir)
console.timeEnd("create ssr router index")

const { manifest, cssMap } = await bundle(ssrRouterIndex.bundleEntrypoints, {
	outDir,
	postcssConfig,
	publicDir: path.resolve(args["--public-dir"] || "./public"),
})

console.time("create rsc router index")
const rscRouterIndex = await recursivelyBuildRouterIndex(rscPagesDir)
console.timeEnd("create rsc router index")

console.time("install css-bundle-plugin")
cssBundlePlugin(cssMap)
console.timeEnd("install css-bundle-plugin")

console.time("hydrate matchable routes imports")
await hydrateMatchableRoutesImports(ssrRouterIndex.regexes)
await hydrateMatchableRoutesImports(rscRouterIndex.regexes)
console.timeEnd("hydrate matchable routes imports")

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
