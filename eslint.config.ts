// @ts-check
import style, { GLOB_JSON, GLOB_JSONC, type TypedFlatConfigItem } from "@isentinel/eslint-config";
import biome from "eslint-config-biome";

export default style(
	{
		formatters: {
			markdown: true,
			prettierOptions: {
				arrowParens: "always",
				endOfLine: "auto",
				printWidth: 120,
				quoteProps: "as-needed",
				semi: true,
				singleQuote: false,
				tabWidth: 4,
				trailingComma: "all",
				useTabs: true,
			},
		},
		ignores: ["benchmarks/**", ".lune/**", "do-not-sync-ever/**", "data/**", "node_modules/**", "*.yml", "*.yaml"],
		perfectionist: {
			customClassGroups: [
				"onInit",
				"onStart",
				"onProfileUpdated",
				// "onPlayerJoin",
				// "onPlayerLeave",
				"onRender",
				"onPhysics",
				"onTick",
			],
		},
		pnpm: false,
		react: true,
		roblox: false,
		rules: {
			"arrow-style/arrow-return-style": "off",
			// makes shit less neat
			"no-inline-comments": "off",
			"no-restricted-syntax": "off",
			"perfectionist/sort-objects": [
				"warn",
				{
					customGroups: {
						id: "^id$",
						name: "^name$",
						callbacks: ["\b(on[A-Z][a-zA-Z]*)\b"],
						reactProps: ["^children$", "^ref$"],
					},
					groups: ["id", "name", "unknown", "reactProps"],
					order: "asc",
					partitionByComment: "^Part:\\*\\*(.*)$",
					type: "natural",
				},
			],
			// ugly and makes max-lines-per-function even worse
			"style/padding-line-between-statements": "off",
			"test/require-hook": "off",
			// does not work with jest for luau
			"test/valid-expect": "off",
			// kid named "no operation"
			"ts/no-empty-function": "off",
			// sometimes stuff isn't added. this is unhelpful as a result.
			"ts/no-empty-object-type": "off",
			// worthless lint. always incorrect.
			"ts/no-unsafe-argument": "off",
			// worthless lint. always incorrect.
			"ts/no-unsafe-assignment": "off",
			// worthless lint. always incorrect.
			"ts/no-unsafe-call": "off",
			// worthless lint. always incorrect.
			"ts/no-unsafe-member-access": "off",
			// worthless lint. always incorrect.
			"ts/no-unsafe-return": "off",
			// rule conflict
			"ts/strict-boolean-expressions": "off",
			"ts/unbound-method": "off",
			"unicorn/consistent-destructuring": "off",
			// this is just outright annoying
			"unicorn/no-keyword-prefix": "off",
			"unicorn/no-useless-undefined": ["error", { checkArguments: false, checkArrowFunctionBody: false }],
		},
		spellCheck: false,
		test: true,
		toml: false,
		type: "game",
		yaml: false,
	},
	{
		// only components, controllers, and services which end in either ts or tsx
		files: ["src/**/*.{ts,tsx}"],
		rules: {
			"perfectionist/sort-classes": [
				"warn",
				{
					customGroups: [],
					groups: [
						"static-property",
						"static-method",
						"property",
						["get-method", "set-method"],
						"method",
						"constructor",
						[
							// Static protected/property
							"protected-static-property",
							"protected-static-accessor-property",
							"protected-static-get-method",
							"protected-static-set-method",
							"protected-static-method",
							// Static private/property
							"private-static-property",
							"private-static-accessor-property",
							"private-static-get-method",
							"private-static-set-method",
							"private-static-method",
							// Instance protected/property
							"protected-property",
							"protected-accessor-property",
							"protected-get-method",
							"protected-set-method",
							"protected-method",
							// Instance private/property
							"private-property",
							"private-accessor-property",
							"private-get-method",
							"private-set-method",
							"private-method",
						],
					],
					order: "asc",
				},
			],
		},
	},
	{
		files: [GLOB_JSON, GLOB_JSONC, "src/*.ts"],
		rules: {
			// highly annoying
			"max-lines": "off",
		},
	},
	{
		files: ["src/**/__tests__/**/*.ts"],
		rules: {
			// highly annoying
			"max-lines": "off",
			"max-lines-per-function": "off",
			"test/require-hook": "off",
		},
	},
	{
		files: ["benchmarks/**", ".lune/**", "do-not-sync-ever/**", "data/**", "node_modules/**", "*.yml", "*.yaml"],
		rules: { "*": "off" },
	},
).append(biome as TypedFlatConfigItem);
