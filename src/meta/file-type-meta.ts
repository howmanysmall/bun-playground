// import { confirm, input, type Separator, select } from "@inquirer/prompts";
// import { type INIStringifyOptions, type JSONStringifyOptions, stringifyINI } from "confbox";
// import FileType from "./file-type";
// import type { TypeToOptions } from "./types";

// // biome-ignore lint/suspicious/noConstEnum: not built.
// const enum Platform {
// 	Other = "other",
// 	Win32 = "win32",
// }
// const DEFAULT_PLATFORM: Platform = process.platform === "win32" ? Platform.Win32 : Platform.Other;
// type GetValueAsync<T> = () => Promise<T>;

// function createBoolean(message: string, defaultValue?: boolean): GetValueAsync<boolean> {
// 	return () => confirm({ default: defaultValue, message });
// }
// function createChoice<T extends string>(
// 	choices: ReadonlyArray<T | Separator>,
// 	message: string,
// 	defaultValue?: string,
// ): GetValueAsync<T> {
// 	return () => select({ choices, default: defaultValue, message });
// }
// function createString(message: string, defaultValue?: string, required?: boolean): GetValueAsync<string> {
// 	return () => input({ default: defaultValue, message, required });
// }

// type PromptMetaType = {
// 	readonly [fileType in FileType]: TypeToOptions[fileType] extends undefined
// 		? never
// 		: {
// 				readonly [key in keyof TypeToOptions[fileType]]: () => Promise<TypeToOptions[fileType][key]>;
// 			};
// };
// const PromptMeta: PromptMetaType = {
// 	[FileType.Ini]: {
// 		align: createBoolean("Do you want to align the `=` character for each section?", false),
// 		bracketedArray: createBoolean(
// 			"Do you want to append `[]` to array keys? Some parsers treat duplicate names by themselves as arrays.",
// 			false,
// 		),
// 		newline: createBoolean("Do you want to insert a newline after each section header?", true),
// 		platform: createChoice<Platform>(
// 			[Platform.Win32, Platform.Other],
// 			"Which platform line-endings should be used?",
// 			DEFAULT_PLATFORM,
// 		),
// 		section: createString(
// 			"What identifier do you want to use for global items and to prepend to all other sections?",
// 			undefined,
// 			false,
// 		),
// 		sort: createBoolean("Do you want to sort all sections & their keys alphabetically?", false),
// 		whitespace: createBoolean("Do you want to insert spaces before & after `=` characters?", true),
// 	},
// 	[FileType.Json]: {},
// };

// type FileTypeMetaType = {
// 	readonly [fileType in FileType]: {
// 		readonly promptOptionsAsync: () => Promise<TypeToOptions[fileType]>;
// 		readonly stringify: (data: unknown, options: TypeToOptions[fileType]) => string;
// 	};
// };

// export const FileTypeMeta: FileTypeMetaType = {
// 	[FileType.Ini]: {
// 		promptOptionsAsync: async (): Promise<INIStringifyOptions> => {
// 			const options: INIStringifyOptions = {};
// 			for (const [key, getValueAsync] of Object.entries(PromptMeta[FileType.Ini])) {
// 			}

// 			return options;
// 		},
// 		stringify: (data: unknown, options: INIStringifyOptions): string => stringifyINI(data, options),
// 	},
// 	[FileType.Json]: {
// 		promptOptionsAsync: async (): Promise<JSONStringifyOptions> => {
// 			const indent;

// 			return { align, bracketedArray, newline, platform, section, sort, whitespace };
// 		},
// 		stringify: (data: unknown, options: INIStringifyOptions): string => stringifyINI(data, options),
// 	},
// };

// export default FileTypeMeta;
