import type { Cleanup } from "types/utility-types";

export type ArrayPredicate<T extends NonNullable<unknown>, Returns> = (
	value: T,
	index: number,
	array: ReadonlyArray<T>,
) => Returns;

/** Interface for objects that depend on observables. */
export interface Dependent {
	/**
	 * Invalidates the current value, causing a recalculation when next
	 * accessed.
	 */
	invalidate(): void;
}

/** Interface for objects that can notify dependents of changes. */
export interface Observable {
	/** Adds a dependent to this observable. */
	addDependent(dependent: Dependent): void;

	/** Removes a dependent from this observable. */
	removeDependent(dependent: Dependent): void;
}

/** Interface for objects that can notify their dependents of changes. */
export interface Notifiable {
	/** Notifies all dependents that this object has changed. */
	notifyDependents(): void;
}

/**
 * Represents a reactive value that can be observed.
 *
 * @template T The type of the value stored in the reactive.
 */
export interface Reactive<T> extends Notifiable, Observable {
	/** The current value. Alias for {@linkcode peek} */
	value: T;

	/** Gets the current value. */
	get(): T;

	/**
	 * Registers a callback for value changes.
	 *
	 * @param callback - The function to call when the value changes.
	 * @returns A function that can be called to unregister the callback.
	 */
	onChange(callback: (value: T) => void): Cleanup;

	/** Gets the current value without tracking dependencies. */
	peek(): T;

	/** Alias for {@linkcode Reactive.get}. */
	read(): T;

	/**
	 * Sets the current value.
	 *
	 * @param newValue - The new value to set.
	 */
	set(newValue: T): void;
}

/**
 * Represents a writable reactive value that can be set.
 *
 * @template T The type of the value stored in the state.
 */
export interface WritableReactive<T> extends Reactive<T> {
	/**
	 * Sets the current value of the state. If the value has changed, notifies
	 * dependents and triggers change listeners.
	 *
	 * @param value
	 */
	set(value: T): void;

	/**
	 * Sets the current value of the state. If the value has changed, notifies
	 * dependents and triggers change listeners.
	 *
	 * @param value
	 */
	write(value: T): void;
}

export interface Tracked<T> {
	readonly dependencies: Set<Observable>;
	readonly result: T;
}
