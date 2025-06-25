const OS_COMMAND_8 = "\x1B]8;;";
const STRING_TERMINATOR = "\x1B\\";

/**
 * Generates a clickable terminal hyperlink using ANSI OSC 8 escape sequences.
 *
 * Many modern terminals (e.g., iTerm2, Windows Terminal, some Linux terminals)
 * support clickable links. If the terminal does not support OSC 8, the output
 * will display as plain text.
 *
 * @example
 *
 * ```ts
 * console.log(terminalLink("https://bun.sh", "Visit Bun"));
 * ```
 *
 * @param url - The URL to link to. Can be a string or a URL object.
 * @param text - Optional display text for the link. If omitted, the URL itself
 *   is shown.
 * @returns The formatted string containing the clickable hyperlink for
 *   supported terminals.
 */
export default function terminalLink(url: string | URL, text?: string): string {
	const urlString = url instanceof URL ? url.toString() : url;
	return `${OS_COMMAND_8}${urlString}${STRING_TERMINATOR}${text ?? urlString}${OS_COMMAND_8}${STRING_TERMINATOR}`;
}
