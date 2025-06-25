/**
 * Gets an environment variable and throws an error if it is not set.
 *
 * @param name - The name of the environment variable to require.
 * @param isOptional -  Whether the environment variable is optional.
 * @returns The value of the environment variable, or undefined if it is optional and not set.
 */
export default function requireEnvironment(name: string, isOptional?: false): string;
export default function requireEnvironment(name: string, isOptional: true): string | undefined;
export default function requireEnvironment(name: string, isOptional = false): string | undefined {
	const value = Bun.env[name];
	if (!value && !isOptional) {
		console.error(`⚠️  Please set ${name} in your .env`);
		process.exit(1);
	}
	return value;
}
