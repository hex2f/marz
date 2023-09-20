import path from "path"
import fs from "fs/promises"

const environment = process.env.NODE_ENV || "development"
const noMinify = process.env.NO_MINIFY === "true"
const isDebug = process.env.DEBUG === "true"

const transpiler = new Bun.Transpiler({ loader: "tsx" })

export type Manifest = Record<string, { id: string; chunks: string[]; name: string }>

export async function bundle(entrypoints: string[], { outDir, publicDir }: { outDir: string; publicDir?: string }) {
	const outPath = path.resolve(outDir)
	try {
		await fs.rm(outPath, { recursive: true })
	} catch (e) {
		console.log(e)
	}
	await fs.mkdir(outPath)

	const ignoredClientDeps = new Set<string>([])
	const clientDeps = await resolveClientComponentDependencies(entrypoints, ignoredClientDeps)
	if (isDebug) console.log("client deps", clientDeps)

	const clientOutPath = path.join(outPath, "client")

	await fs.mkdir(clientOutPath)
	if (publicDir) await fs.cp(publicDir, clientOutPath, { recursive: true })

	await fs.mkdir(path.join(outPath, "server"))
	await fs.mkdir(path.join(outPath, "server", "routes"))

	const rundir = process.cwd().split(path.sep)
	const marzdir = (await Bun.resolve("marz", ".")).split(path.sep)

	let commonDirPath = ""
	for (let i = 0; i < rundir.length; i++) {
		if (rundir[i] !== marzdir[i]) break
		commonDirPath += rundir[i] + path.sep
	}
	if (isDebug) console.log("common dir path", commonDirPath)

	const clientEntry = path.resolve(import.meta.dir, "./client/index.tsx")
	const clientRouter = path.resolve(import.meta.dir, "./client/router.tsx")
	if (isDebug) console.log("client entry", clientEntry)
	if (isDebug) console.log([clientEntry, ...Array.from(clientDeps.values()).map((dep) => dep.entrypoint)])

	console.time("bundle client deps")
	const client = await Bun.build({
		entrypoints: [clientEntry, ...Array.from(clientDeps.values()).map((dep) => dep.entrypoint)],
		target: "browser",
		sourcemap: "external",
		splitting: true,
		format: "esm",
		root: commonDirPath,
		outdir: clientOutPath,
		minify: !noMinify,
		publicPath: "./",
		define: {
			"process.env.NODE_ENV": `"${environment}"`,
		},
		plugins: [],
	})
	if (!client.success) {
		console.error(client.logs)
		throw new Error("client build failed")
	}
	if (isDebug) console.log("client outputs", client)
	console.timeEnd("bundle client deps")

	console.time("build manifest")
	// there definitely is a better way to do all this,
	// this code was thrown together in a half-lucid sleep-deprived state
	const clientDepsMap = [{ entrypoint: clientEntry, exports: ["default"] }, ...Array.from(clientDeps.values())].reduce(
		(acc, dep) => {
			const fileName = dep.entrypoint.slice(commonDirPath.length - 1)
			const withoutExtension = fileName.split(".").slice(0, -1).join(".")
			acc[withoutExtension] = { path: dep.entrypoint, fileName, withoutExtension, exports: dep.exports }
			return acc
		},
		{} as Record<string, { path: string; fileName: string; withoutExtension: string; exports: string[] }>,
	)
	if (isDebug) console.log(clientDepsMap)

	const manifest = client.outputs.reduce((acc, output) => {
		const fileName = output.path.slice(clientOutPath.length)
		const withoutExtension = fileName.split(".").slice(0, -1).join(".")

		if (withoutExtension in clientDepsMap) {
			const dep = clientDepsMap[withoutExtension]

			// this aint great i dont love this
			switch (dep.path) {
				case clientEntry:
					acc["client-entry"] = { id: fileName, chunks: [fileName], name: "default" }
					break
				case clientRouter:
					acc["client-router"] = { id: fileName, chunks: [fileName], name: "default" }
				// let client router fall through since it may be imported by other components
				default:
					for (const exp of dep.exports) {
						acc[`${dep.fileName}#${exp}`] = {
							id: fileName,
							chunks: [fileName],
							name: exp,
						}
					}
			}
		}

		return acc
	}, {} as Record<string, { id: string; chunks: string[]; name: string }>)

	if (isDebug) console.log("manifest", manifest)
	await Bun.write(path.join(outPath, "manifest.json"), JSON.stringify(manifest, null, 2))
	console.timeEnd("build manifest")

	console.time("bundle server routes")
	if (isDebug) console.log("entrypoints", entrypoints)
	const serverRoutes = await Bun.build({
		entrypoints,
		target: "bun",
		sourcemap: "none",
		splitting: true,
		format: "esm",
		outdir: path.join(outPath, "server", "routes"),
		minify: environment === "production",
		define: {
			"process.env.NODE_ENV": `"${environment}"`,
		},
		plugins: [
			{
				name: "rsc-server",
				setup(build) {
					build.onLoad({ filter: /\.(ts|tsx)$/ }, async (args) => {
						const code = await Bun.file(args.path).text()
						if (!code.startsWith(`"use client"`) && !code.startsWith(`'use client'`)) {
							// if not a client component, just return the code and let it be bundled
							return {
								contents: code,
								loader: "tsx",
							}
						}

						// if it is a client component, return a reference to the client bundle
						const outputKey = `/${args.path.slice(commonDirPath.length)}`
						// const outputKey = args.path.slice(appRoot.length)

						if (isDebug) console.log("outputKey", outputKey)

						const moduleExports = transpiler.scan(code).exports
						if (isDebug) console.log("exports", moduleExports)

						let refCode = ""
						for (const exp of moduleExports) {
							if (exp === "default") {
								refCode += `\nexport default { $$typeof: Symbol.for("react.client.reference"), $$async: false, $$id: "${outputKey}#default", name: "default" }`
							} else {
								refCode += `\nexport const ${exp} = { $$typeof: Symbol.for("react.client.reference"), $$async: false, $$id: "${outputKey}#${exp}", name: "${exp}" }`
							}
						}

						if (isDebug) console.log("generated code", refCode)

						return {
							contents: refCode,
							loader: "js",
						}
					})
				},
			},
		],
	})

	if (!serverRoutes.success) {
		console.error(serverRoutes.logs)
		throw new Error("server routes build failed")
	}

	console.timeEnd("bundle server routes")

	return { manifest }
}

function isClientComponent(code: string) {
	return code.startsWith('"use client"') || code.startsWith("'use client'")
}

type ClientDep = { entrypoint: string; exports: string[] }

export async function resolveClientComponentDependencies(
	entrypoints: string[],
	ignoredFiles: Set<string> = new Set(),
	clientDeps: Set<ClientDep> = new Set(),
	resolutionCache: Map<string, string> = new Map(),
	processedFiles: Set<string> = new Set(),
	depth = 0,
): Promise<Set<ClientDep>> {
	if (depth > 25) {
		console.warn("returning early from resolveClientComponentDependencies. Too many levels of dependency.")
		return clientDeps
	}
	for (const entrypoint of entrypoints) {
		if (processedFiles.has(entrypoint) || ignoredFiles.has(entrypoint)) {
			continue
		}

		const file = await Bun.file(entrypoint)
		const contents = await file.text()

		const depScan = await transpiler.scan(contents)
		if (isClientComponent(contents)) {
			clientDeps.add({ entrypoint, exports: depScan.exports })
		}

		processedFiles.add(entrypoint)

		const deps = (
			await Promise.all(
				depScan.imports.map(async (dep) => {
					try {
						let resolved = resolutionCache.get(dep.path)
						if (!resolved) {
							resolved = await Bun.resolve(dep.path, entrypoint.split("/").slice(0, -1).join("/"))
							resolutionCache.set(dep.path, resolved)
						}
						return resolved
					} catch (e) {
						console.warn(e)
					}
				}),
			)
		).filter(Boolean) as string[]

		await resolveClientComponentDependencies(deps, ignoredFiles, clientDeps, resolutionCache, processedFiles, depth + 1)
	}

	return clientDeps
}
