export default function cssBundlePlugin(cssMap: Map<string, string>) {
	Bun.plugin({
		name: "marz-css-bundle",
		async setup(build) {
			build.onLoad({ filter: /\.css$/ }, async (args) => {
				const cssPath = cssMap.has(args.path) ? cssMap.get(args.path) : args.path
				return {
					contents: `export default '${cssPath}'`,
					loader: "js",
				}
			})
		},
	})
}
