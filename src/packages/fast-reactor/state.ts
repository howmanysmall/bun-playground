import type { Cleanup } from "types/utility-types";
import { Computed } from "./computed";
import { trackDependency } from "./dependency-tracker";
import type { Dependent, Reactive } from "./types";

function notifyDependents(dependents: Set<Dependent>): void {
	for (const dependent of [...dependents]) dependent.invalidate();
}
function onValueChanged<T>(dependents: Set<Dependent>, listeners: Set<(value: T) => void>, value: T): void {
	notifyDependents(dependents);
	for (const listener of listeners) listener(value);
}

/**
 * Represents a reactive state container that notifies dependents when its value
 * changes.
 *
 * @template T The type of the value stored in the state.
 */
export class State<T> implements Reactive<T> {
	public get value(): T {
		return this.peek();
	}

	public set value(items: T) {
		this.set(items);
	}

	public addDependent(dependent: Dependent): void {
		this.dependents.add(dependent);
	}

	/**
	 * Creates a derived boolean state that tests a condition on this state's
	 * value.
	 *
	 * @param predicate - The predicate function to test the value of this
	 *   state.
	 * @returns A new computed boolean state that applies the predicate function
	 *   to the value of this state.
	 */
	public filter(predicate: (value: T) => boolean): Computed<boolean> {
		return new Computed<boolean>((): boolean => predicate(this.get()));
	}

	public get(): T {
		trackDependency(this);
		return this.internalValue;
	}

	/**
	 * Creates a derived state that transforms the value of this state.
	 *
	 * @param selector - The selector function to apply to the value of this
	 *   state.
	 * @returns A new computed state that applies the selector function to the
	 *   value of this state.
	 */
	public map<R>(selector: (value: T) => R): Computed<R> {
		return new Computed<R>((): R => selector(this.get()));
	}

	public notifyDependents(): void {
		notifyDependents(this.dependents);
	}

	public onChange(callback: (value: T) => void): Cleanup {
		const { listeners } = this;
		listeners.add(callback);
		return () => listeners.delete(callback);
	}

	/** Called when the value changes. */
	public onValueChanged(): void {
		onValueChanged(this.dependents, this.listeners, this.internalValue);
	}

	public peek(): T {
		return this.internalValue;
	}

	public read(): T {
		return this.get();
	}

	public removeDependent(dependent: Dependent): void {
		this.dependents.delete(dependent);
	}

	public set(value: T): void {
		if (this.internalValue === value) return;
		this.internalValue = value;
		onValueChanged(this.dependents, this.listeners, value);
	}

	public write(value: T): void {
		this.set(value);
	}

	/**
	 * Creates a new reactive state with the given initial value.
	 *
	 * @param initialValue - What the value of the state should be when
	 *   initialized.
	 */
	public constructor(initialValue: T) {
		this.internalValue = initialValue;
	}

	private readonly dependents = new Set<Dependent>();
	private internalValue: T;
	private readonly listeners = new Set<(value: T) => void>();
}
