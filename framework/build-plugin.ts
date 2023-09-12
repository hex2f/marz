import type { BunPlugin } from "bun"

export const MarzBuildPlugin: BunPlugin = {
	name: "Custom loader",
	setup(build) {
		build.onLoad({ filter: /\.(ts|tsx)$/ }, async (args) => {
			const file = await Bun.file(args.path)
			const contents = await file.text()
			// if (!contents.startsWith(`"use client"`)) {
			// 	return {
			// 		contents: "/* SKIPPED */",
			// 		loader: args.loader,
			// 	}
			// }
			return {
				contents: contents,
				loader: args.loader,
			}
		})
	},
}
