import createRouterFromDirectory, { recursivelyBuildRouterIndex } from "./framework/server/router"

import { bundle } from "./framework/bundler"
import createWorker from "./framework/server/worker"
import path from "path"

console.time("total - compile marz app")
const ssrPagesDir = path.resolve("./pages")
const rscPagesDir = path.resolve("./.marz/server/routes")

console.time("create ssr router index")
const ssrRouterIndex = await recursivelyBuildRouterIndex(ssrPagesDir, {}, [])
console.timeEnd("create ssr router index")

const { manifest } = await bundle(ssrRouterIndex.bundleEntrypoints, {
	outDir: ".marz",
})

console.time("create rsc router index")
const rscRouterIndex = await recursivelyBuildRouterIndex(rscPagesDir, {}, [])
console.timeEnd("create rsc router index")

console.time("reconcile routes")
const ssrRouter = await createRouterFromDirectory(ssrPagesDir, { routerIndex: ssrRouterIndex })
const rscRouter = await createRouterFromDirectory(rscPagesDir, { routerIndex: rscRouterIndex })
console.timeEnd("reconcile routes")

console.timeEnd("total - compile marz app")

console.time("create worker")
const worker = await createWorker({
	rscRouter,
	ssrRouter,
	manifest,
	publicDir: path.resolve("./.marz/client")
})
console.timeEnd("create worker")

console.log("🚀 running")
