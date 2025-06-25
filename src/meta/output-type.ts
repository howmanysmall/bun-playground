/**
 * Specifies the supported output formats for displaying data.
 *
 * @remarks
 * Determines how tabular data is rendered in the CLI.
 */
export enum OutputType {
	/**
	 * Use the built-in `console.table` for output.
	 */
	ConsoleTable = "console.table",

	/**
	 * Use the `cli-table3` package for output.
	 */
	CliTable3 = "cli-table3",
}
export default OutputType;
