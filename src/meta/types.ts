import type { INIStringifyOptions, JSON5StringifyOptions, JSONStringifyOptions, YAMLStringifyOptions } from "confbox";
import type { JSONCStringifyOptions } from "confbox/jsonc";
import type FileType from "./file-type";

export type TypeToOptions = {
	[FileType.Ini]: INIStringifyOptions;
	[FileType.Json]: JSONStringifyOptions;
	[FileType.Json5]: JSON5StringifyOptions;
	[FileType.JsonC]: JSONCStringifyOptions;
	[FileType.Toml]: undefined;
	[FileType.Yaml]: YAMLStringifyOptions;
};
