#!/usr/bin/env bun

import arg from "arg"

const args = arg({
	"--help": Boolean,
	"--pages-dir": String,
	"--public-dir": String,
	"--out-dir": String,

	"-h": "--help",
})

if (args["--help"]) {
	console.log(`
Options
  --help, -h    Show this help message

  --pages-dir  <path> Default: ./pages
  --public-dir <path> Default: ./public
  --out-dir    <path> Default: .marz

Examples
  $ marz build
  $ marz build --pages-dir ./src/pages --public-dir ./src/public --out-dir .marz
`)
	process.exit(0)
}

import { recursivelyBuildRouterIndex } from "./framework/server/router"

import path from "path"
import { bundle } from "./framework/bundler"

console.time("total - compile marz app")
const outDir = path.resolve(args["--out-dir"] || ".marz")
const ssrPagesDir = path.resolve(args["--pages-dir"] || "./pages")

console.time("create ssr router index")
const ssrRouterIndex = await recursivelyBuildRouterIndex(ssrPagesDir)
console.timeEnd("create ssr router index")

await bundle(ssrRouterIndex.bundleEntrypoints, {
	outDir,
	publicDir: path.resolve(args["--public-dir"] || "./public"),
})

console.timeEnd("total - compile marz app")
