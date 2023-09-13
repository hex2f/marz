import path from "path"
import fs from "fs/promises"

const environment = process.env.NODE_ENV || "development"
const isDebug = process.env.DEBUG === "true"

const transpiler = new Bun.Transpiler({ loader: "tsx" })

export async function bundle(entrypoints: string[], { outDir }: { outDir: string }) {
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
	await fs.mkdir(path.join(outPath, "server"))
	await fs.mkdir(path.join(outPath, "server", "routes"))

	console.time("bundle client deps")
	const client = await Bun.build({
		entrypoints: ["./framework/client/index.tsx", ...Array.from(clientDeps.values()).map((dep) => dep.entrypoint)],
		target: "browser",
		sourcemap: "external",
		root: path.resolve("./"),
		splitting: true,
		format: "esm",
		outdir: clientOutPath,
		minify: environment === "production",
		define: {
			"process.env.NODE_ENV": `"${environment}"`,
		},
		plugins: [],
	})
	console.timeEnd("bundle client deps")

	console.time("build manifest")
	// there definitely is a better way to do all this,
	// this code was thrown together in a half-lucid sleep-deprived state
	const appRoot = path.resolve(path.join(outDir, ".."))
	const clientDepsMap = Array.from(clientDeps.values()).reduce((acc, dep) => {
		const fileName = dep.entrypoint.slice(appRoot.length)
		const withoutExtension = fileName.split(".").slice(0, -1).join(".")
		acc[withoutExtension] = { path: dep.entrypoint, fileName, withoutExtension, exports: dep.exports }
		return acc
	}, {} as Record<string, { path: string; fileName: string; withoutExtension: string; exports: string[] }>)

	const manifest = client.outputs.reduce((acc, output) => {
		const fileName = output.path.slice(clientOutPath.length)
		const withoutExtension = fileName.split(".").slice(0, -1).join(".")

		if (withoutExtension in clientDepsMap) {
			const dep = clientDepsMap[withoutExtension]
			for (const exp of dep.exports) {
				acc[`${dep.fileName}#${exp}`] = {
					id: fileName,
					chunks: [fileName],
					name: exp,
				}
			}
		}

		return acc
	}, {} as Record<string, { id: string; chunks: string[]; name: string }>)
	if (isDebug) console.log("manifest", manifest)
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
						const outputKey = args.path.slice(appRoot.length)

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
