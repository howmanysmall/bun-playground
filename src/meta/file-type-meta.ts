import { confirm, input, type Separator, select } from "@inquirer/prompts";
import {
	type INIStringifyOptions,
	type JSON5StringifyOptions,
	type JSONStringifyOptions,
	stringifyINI,
	type YAMLStringifyOptions,
} from "confbox";
import type { JSONCStringifyOptions } from "confbox/jsonc";
import FileType from "./file-type";

// biome-ignore lint/suspicious/noConstEnum: not built.
const enum Platform {
	Other = "other",
	Win32 = "win32",
}
const DEFAULT_PLATFORM: Platform = process.platform === "win32" ? Platform.Win32 : Platform.Other;

type FormatOptions = {
	[FileType.Ini]: INIStringifyOptions;
	[FileType.Json]: JSONStringifyOptions;
	[FileType.Json5]: JSON5StringifyOptions;
	[FileType.JsonC]: JSONCStringifyOptions;
	[FileType.Toml]: undefined;
	[FileType.Yaml]: YAMLStringifyOptions;
};

type GetValueAsync<T> = () => Promise<T>;

// interface BooleanOption {
// 	readonly defaultValue?: boolean;
// 	readonly description: string;
// 	getValueAsync(): Promise<boolean>;
// }
// interface SelectionOption<T = unknown> {
// 	readonly defaultValue?: T;
// 	readonly description: string;
// 	getValueAsync(): Promise<T>;
// }
// interface StringOption {
// 	readonly defaultValue?: string;
// 	readonly description: string;
// 	getValueAsync(): Promise<string>;
// }

function createBoolean(message: string, defaultValue?: boolean): GetValueAsync<boolean> {
	return () => confirm({ default: defaultValue, message });
}
function createChoice<T extends string>(
	choices: ReadonlyArray<T | Separator>,
	message: string,
	defaultValue?: string,
): GetValueAsync<T> {
	return () => select({ choices, default: defaultValue, message });
}
function createString(message: string, defaultValue?: string, required?: boolean): GetValueAsync<string> {
	return () => input({ default: defaultValue, message, required });
}

type PromptMetaType = {
	readonly [fileType in FileType]: FormatOptions[fileType] extends undefined
		? never
		: {
				readonly [key in keyof FormatOptions[fileType]]: () => Promise<FormatOptions[fileType][key]>;
			};
};
const PromptMetaType: PromptMetaType = {
	[FileType.Ini]: {
		align: createBoolean("Do you want to align the `=` character for each section?", false),
		bracketedArray: createBoolean(
			"Do you want to append `[]` to array keys? Some parsers treat duplicate names by themselves as arrays.",
			false,
		),
		newline: createBoolean("Do you want to insert a newline after each section header?", true),
		platform: createChoice<Platform>(
			[Platform.Win32, Platform.Other],
			"Which platform line-endings should be used?",
			DEFAULT_PLATFORM,
		),
		section: createString(
			"What identifier do you want to use for global items and to prepend to all other sections?",
			undefined,
			false,
		),
		sort: createBoolean("Do you want to sort all sections & their keys alphabetically?", false),
		whitespace: createBoolean("Do you want to insert spaces before & after `=` characters?", true),
	},
	[FileType.Json]: {},
};

async function getOptionsAsync<T extends FileType>(
	fileType: T,
): PromptMetaType[T] extends undefined ? never : Promise<FormatOptions[T]> {
	const options: Partial<FormatOptions[T]> = {};
	for (const [key, getValueAsync] of Object.entries(PromptMetaType[fileType])) {
		options[key] = getValueAsync();
	}
	return Promise.all(Object.values(options)) as Promise<FormatOptions[T]>;
}

type FileTypeMetaType = {
	readonly [fileType in FileType]: {
		readonly promptOptionsAsync: () => Promise<FormatOptions[fileType]>;
		readonly stringify: (data: unknown, options: FormatOptions[fileType]) => string;
	};
};

export const FileTypeMeta: FileTypeMetaType = {
	[FileType.Ini]: {
		promptOptionsAsync: async (): Promise<INIStringifyOptions> => {
			const options: INIStringifyOptions = {};
			for (const [key, getValueAsync] of Object.entries(PromptMetaType[FileType.Ini])) {
			}

			return options;
		},
		stringify: (data: unknown, options: INIStringifyOptions): string => stringifyINI(data, options),
	},
	[FileType.Json]: {
		promptOptionsAsync: async (): Promise<JSONStringifyOptions> => {
			const options: JSONStringifyOptions = {};

			const whitespace = await confirm({
				default: true,
				message: "Do you want to insert spaces before & after `=` characters?",
			});
			const align = await confirm({
				default: false,
				message: "Do you want to align the `=` character for each section?",
			});
			const sort = await confirm({
				default: false,
				message: "Do you want to sort all sections & their keys alphabetically?",
			});
			const newline = await confirm({
				default: true,
				message: "Do you want to insert a newline after each section header?",
			});
			const bracketedArray = await confirm({
				default: false,
				message:
					"Do you want to append `[]` to array keys? Some parsers treat duplicate names by themselves as arrays.",
			});
			const platform = await select<Platform>({
				choices: [Platform.Win32, Platform.Other],
				default: DEFAULT_PLATFORM,
				loop: false,
				message: "Which platform line-endings should be used?",
			});
			const section = await input({
				message: "What identifier do you want to use for global items and to prepend to all other sections?",
				required: false,
			});

			return { align, bracketedArray, newline, platform, section, sort, whitespace };
		},
		stringify: (data: unknown, options: INIStringifyOptions): string => stringifyINI(data, options),
	},
};

export default FileTypeMeta;
