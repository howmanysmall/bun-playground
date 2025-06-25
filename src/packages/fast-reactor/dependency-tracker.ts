import type { Dependent, Observable } from "./types";

const currentDependencies = new Set<Observable>();
const dependentStack = new Array<Dependent>();
let length = 0;

export interface Tracked<T> {
	readonly dependencies: Set<Observable>;
	readonly result: T;
}

/**
 * Gets the current dependent being tracked, if any.
 *
 * @returns The current dependent or `undefined` if there is no current
 *   dependent.
 */
export function getCurrentDependent(): Dependent | undefined {
	return length > 0 ? dependentStack[length - 1] : undefined;
}

/**
 * Executes the specified function with dependency tracking.
 *
 * @template T The type of the result.
 * @param dependent - The dependent that is tracking the dependencies.
 * @param callback - The function to execute while tracking dependencies.
 * @returns A `Tracked` object containing the dependencies and the result of
 *   the callback. If the callback fails, returns `undefined`.
 */
export function track<T>(dependent: Dependent, callback: () => T): Tracked<T> {
	dependentStack[length++] = dependent;
	currentDependencies.clear();

	try {
		const result = callback();
		return {
			dependencies: new Set(currentDependencies),
			result,
		};
	} finally {
		const value = dependentStack[length - 1];
		delete dependentStack[length - 1];
		if (value !== undefined) length -= 1;

		currentDependencies.clear();
	}
}

/**
 * Tracks that the current computation depends on the specified observable.
 *
 * @param observable - The observable to track as a dependency.
 */
export function trackDependency(observable: Observable): void {
	if (length <= 0) return;

	const currentDependent = getCurrentDependent();
	if (currentDependent) {
		currentDependencies.add(observable);
		observable.addDependent(currentDependent);
	}
}
