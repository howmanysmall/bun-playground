#!/usr/bin/env bun

import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";

async function stripFileAsync(filePath: string): Promise<void> {
	const file = Bun.file(filePath);
	const content = await file.text();
	const stripped = content.replace(/[ \t]+$/gm, "");
	if (stripped !== content) {
		await file.write(stripped);
		console.log(`✔ Stripped whitespace: ${filePath}`);
	}
}

async function* walkAsync(directory: string): AsyncGenerator<string> {
	for (const entry of await readdir(directory, { withFileTypes: true })) {
		const fullPath = join(directory, entry.name);
		if (entry.isDirectory()) yield* walkAsync(fullPath);
		else if (entry.isFile()) yield fullPath;
	}
}

async function mainAsync(): Promise<void> {
	const targets = process.argv.slice(2);
	if (targets.length === 0) {
		console.error("Usage: strip-trailing-whitespace.ts <file|directory> [...]");
		process.exit(1);
	}

	for (const target of targets)
		try {
			const info = await stat(target);
			if (info.isDirectory()) for await (const filePath of walkAsync(target)) await stripFileAsync(filePath);
			else await stripFileAsync(target);
		} catch (err) {
			console.error(`Error processing ${target}:`, err);
		}
}

mainAsync().catch((err: unknown) => {
	console.error("Fatal error:", err);
	process.exit(1);
});
