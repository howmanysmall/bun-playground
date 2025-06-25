/**
 * Specifies the supported output formats for displaying data.
 *
 * @remarks
 * Determines how tabular data is rendered in the CLI.
 */
export enum OutputType {
	/** Use the `cli-table3` package for output. */
	CliTable3 = "cli-table3",

	/** Use the built-in `console.table` for output. */
	ConsoleTable = "console.table",
}
export default OutputType;
