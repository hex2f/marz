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

Marz is built on top of Bun, so before you begin, make sure to follow Bun's installation guide.

### Step 1: Install Bun
Install Bun by following their installation guide, which can be found [here](https://bun.sh/docs/installation).

### Step 2: Create Marz
Use the following command to create a Marz project using the interactive [`create-marz`](https://github.com/hex2f/marz/tree/main/packages/create-marz) CLI:

```bash
bun create marz
```

### Step 3: Run the Server
To start the Marz server, execute the following command:

```bash
bun dev
```

This command bundles all your pages and components and starts a server on port 3000.

### Step 4: Define Routes
Routing in Marz is determined by the file structure of your `pages` directory. For example:

- A file at `pages/index.tsx` will be served at `/`.
- A file at `pages/about.tsx` will be served at `/about`.

Each file is expected to export a named `Page` component. Currently, all `Page` components must be server components, but they can import and use client components. Parameters are supported (e.g., `pages/[id].tsx` or `pages/[id]/about.tsx`) and can be accessed via the `params` prop on the `Page` component.

# Known Issues

### Issue 1: Duplicate Export Error
If you encounter a `"Duplicate export of ..."` error, run Marz with the `MINIFY=true` environment variable set. This is caused by an [issue in Bun](https://github.com/oven-sh/bun/issues/5344).

### Issue 2: Page Renders Twice
Currently, the page may render twice. This behavior occurs because the server does not include RSC (React Server Components) hydration with the initial HTML response, so the browser also has to call out to `/__marz` to re-render the page with RSC. This issue will be addressed in a future release.

# Contributing

Contributions are very welcome! This project is still in its early stages, so there are many ways to contribute. If you're interested in contributing, please join the [Discord server](https://discord.gg/M6mS2cwXag) and say hello 👋

# Authors

* Leah Lundqvist ([@hex2f](https://github.com/hex2f))
