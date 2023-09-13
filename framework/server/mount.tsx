import React from "react"

export default function Marz({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<head>
				<title>Marz</title>
			</head>
			<body>
				<main id="__MARZ_MOUNT">{children}</main>
				<script
					type="importmap"
					/* this shouldnt be needed, but for some reason imports end up as just
					   "router.js" in the bundle and im not smart enough to figure it out. */

					// biome-ignore lint/security/noDangerouslySetInnerHtml: this is a static import map, it is not user input
					dangerouslySetInnerHTML={{
						__html: `
						{ "imports": {
						  "router.js": "/framework/client/router.js"
						} }`,
					}}
				/>
				<script
					/* credit: https://github.com/threepointone/server-components-demo/blob/esbuild-take-2/src/Html.js */
					// biome-ignore lint/security/noDangerouslySetInnerHtml: static script, no user input
					dangerouslySetInnerHTML={{
						__html: `
						global = window;
				
						const __bun__module_map__ = new Map();
				
						// we just use webpack's function names to avoid forking react
						global.__webpack_chunk_load__ = async function(moduleId) {
							const mod = await import(moduleId);
							__bun__module_map__.set(moduleId, mod);
							return mod;
						};
				
						global.__webpack_require__ = function(moduleId) {
							// TODO: handle non-default exports
							console.log("require", moduleId)
							return __bun__module_map__.get(moduleId);
						};`,
					}}
				/>
				<script type="module" src="/framework/client/index.js" />
			</body>
		</html>
	)
}
