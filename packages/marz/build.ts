#!/usr/bin/env bun

import arg from "arg"

const args = arg({
	"--help": Boolean,
	"--pages-dir": String,
	"--public-dir": String,
	"--out-dir": String,
	"--postcss": String,

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

Examples
  $ marz build
  $ marz build --pages-dir ./src/pages --public-dir ./src/public --out-dir .marz
`)
	process.exit(0)
}

import path from "path"
import fs from "fs/promises"

import { recursivelyBuildRouterIndex } from "./framework/server/router"
import { bundle } from "./framework/bundler"
import type Postcss from "postcss"

console.time("total - compile marz app")
const outDir = path.resolve(args["--out-dir"] || ".marz")
const ssrPagesDir = path.resolve(args["--pages-dir"] || "./pages")
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

console.time("create ssr router index")
const ssrRouterIndex = await recursivelyBuildRouterIndex(ssrPagesDir)
console.timeEnd("create ssr router index")

await bundle(ssrRouterIndex.bundleEntrypoints, {
	outDir,
	postcssConfig,
	publicDir: path.resolve(args["--public-dir"] || "./public"),
})

console.timeEnd("total - compile marz app")
