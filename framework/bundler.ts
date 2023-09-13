import path from "path"
import fs from "fs/promises"

const environment = process.env.NODE_ENV || "development"

export async function bundle(entrypoints: string[], { outDir }: { outDir: string }) {
	const outPath = path.resolve(outDir)
	try {
		await fs.rm(outPath, { recursive: true })
	} catch (e) {
		console.log(e)
	}
	await fs.mkdir(outPath)

	const ignoredClientDeps = new Set<string>([
		path.join(outPath, "..", "framework", "client", "index.tsx"),
		path.join(outPath, "..", "framework", "client", "router.tsx"),
	])
	const clientDeps = await resolveClientComponentDependencies(entrypoints, ignoredClientDeps)

	const clientOutPath = path.join(outPath, "client")

	await fs.mkdir(clientOutPath)
	await fs.mkdir(path.join(outPath, "server"))
	await fs.mkdir(path.join(outPath, "server", "routes"))

	console.time("bundle client deps")
	const client = await Bun.build({
		entrypoints: ["./framework/client/index.tsx", ...clientDeps.values()],
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
		const fileName = dep.slice(appRoot.length)
		const withoutExtension = fileName.split(".").slice(0, -1).join(".")
		acc[withoutExtension] = { path: dep, fileName, withoutExtension }
		return acc
	}, {} as Record<string, { path: string; fileName: string; withoutExtension: string }>)

	const manifest = client.outputs.reduce((acc, output) => {
		const fileName = output.path.slice(clientOutPath.length)
		const withoutExtension = fileName.split(".").slice(0, -1).join(".")

		if (withoutExtension in clientDepsMap) {
			// todo: handle exports properly
			for (const name of ["", "*", "default"]) {
				if (clientDepsMap[withoutExtension].fileName in acc === false)
					acc[clientDepsMap[withoutExtension].fileName] = {}
				if (name in acc[clientDepsMap[withoutExtension].fileName] === false) {
					// @ts-expect-error, properies get added below
					acc[clientDepsMap[withoutExtension].fileName][name] = {}
				}
				acc[clientDepsMap[withoutExtension].fileName][name] = {
					id: fileName,
					chunks: [fileName],
					name: "",
				}
			}
		}

		return acc
	}, {} as Record<string, Record<string, { id: string; chunks: string[]; name: string }>>)
	console.timeEnd("build manifest")

	console.time("bundle server routes")
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

						return {
							contents:
								// biome-ignore lint/style/useTemplate: for nicer formatting
								'const MODULE_REFERENCE = Symbol.for("react.client.reference");\n' +
								`export default { $$typeof: MODULE_REFERENCE, $$async: false, $$id: "${outputKey}", name: "default" }`,
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

const transpiler = new Bun.Transpiler({ loader: "tsx" })

function isClientComponent(code: string) {
	return code.startsWith('"use client"') || code.startsWith("'use client'")
}

export async function resolveClientComponentDependencies(
	entrypoints: string[],
	ignoredFiles: Set<string> = new Set(),
	clientDeps: Set<string> = new Set(),
	resolutionCache: Map<string, string> = new Map(),
	processedFiles: Set<string> = new Set(),
	depth = 0,
): Promise<Set<string>> {
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

		if (isClientComponent(contents)) {
			clientDeps.add(entrypoint)
		}

		processedFiles.add(entrypoint)

		const deps = (
			await Promise.all(
				(
					await transpiler.scan(contents)
				).imports.map(async (dep) => {
					try {
						let resolved = resolutionCache.get(dep.path)
						if (!resolved) {
							console.time(`resolve ${entrypoint} > ${dep.path}`)
							resolved = await Bun.resolve(dep.path, entrypoint.split("/").slice(0, -1).join("/"))
							resolutionCache.set(dep.path, resolved)
							console.timeEnd(`resolve ${entrypoint} > ${dep.path}`)
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
