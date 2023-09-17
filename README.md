<br/>
<p align="center">
	<picture>
		<img src="https://raw.githubusercontent.com/hex2f/marz/main/banner.png" alt="Marz">
	</picture>
</p>

<p align="center">
	🚀 A Fast and Lightweight React Server Components Framework for <a href="https://bun.sh/">Bun</a>
</p>

<p align="center">
	<a aria-label="Bun" href="https://bun.sh/">
		<img alt="Bun" src="https://img.shields.io/badge/Built_For-Bun-%23f9f1e1?style=for-the-badge&logo=bun&logoColor=%23f9f1e1">
	</a>
	<a aria-label="License" href="https://github.com/hex2f/marz/blob/main/LICENSE">
		<img alt="Static Badge" src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge">
	</a>
	<a aria-label="Discord" href="https://discord.gg/M6mS2cwXag">
		<img alt="Discord" src="https://img.shields.io/discord/1151245976275800114?style=for-the-badge&logo=discord&logoColor=white&label=Discord&color=%235865F2">
	</a>
	<a aria-label="Sponsor" href="https://github.com/sponsors/hex2f">
		<img alt="Static Badge" src="https://img.shields.io/badge/Sponsor-%23EA4AAA?style=for-the-badge&logo=githubsponsors&logoColor=white">
	</a>
</p>

# Disclaimer

This project is still in very early development, and is currently meant to serve as a proof of concept. It is not recommended to use this in production.

# Getting Started

Marz is built on top of [Bun](https://bun.sh/), so you'll need to install that first by following their [installation guide](https://bun.sh/docs/installation).

Then use `bun create marz` to use the interactive [create-marz](https://github.com/hex2f/marz/tree/main/packages/create-marz) CLI.

To run the server, use `bun dev`. This bundles all of your pages and components, and starts a server on port 3000.

Routing is determined by the file structure of your `pages` directory. For example, a file at `pages/index.tsx` will be served at `/`, and a file at `pages/about.tsx` will be served at `/about`. Each file is expected to export a named `Page` component. For now, all `Page` components must be server components, but they can import and use client components. Params are supported (`pages/[id].tsx` or `pages/[id]/about.tsx`), and can be accessed via the `params` prop on the `Page` component.

# Contributing

Contributions are very welcome! This project is still in its early stages, so there are many ways to contribute. If you're interested in contributing, please join the [Discord server](https://discord.gg/M6mS2cwXag) and say hello 👋

# Authors

* Leah Lundqvist ([@hex2f](https://github.com/hex2f))