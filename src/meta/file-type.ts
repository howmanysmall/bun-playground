/**
 * Enumerates supported configuration file formats.
 *
 * @remarks
 * Used to identify and handle different file types for configuration parsing
 * and serialization.
 */
export enum FileType {
	/** INI file format. */
	Ini = "ini",

	/** Standard JSON file format. */
	Json = "json",

	/** JSON5 file format (JSON with comments and more relaxed syntax). */
	Json5 = "json5",

	/** JSONC file format (JSON with comments). */
	JsonC = "jsonc",

	/** TOML file format. */
	Toml = "toml",

	/** YAML file format. */
	Yaml = "yaml",
}
export default FileType;
