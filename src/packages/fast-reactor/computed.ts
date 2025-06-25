//!optimize 2

import type { Cleanup } from "types/utility-types";
import { track, trackDependency } from "./dependency-tracker";
import type { Dependent, Observable, Reactive } from "./types";

function clearDependencies(object: Dependent, dependencies: Set<Observable>): void {
	for (const dependency of dependencies) dependency.removeDependent(object);
	dependencies.clear();
}

const ONLY_ON_COMPUTED_ARRAYS = "This operation is only available on computed arrays";

/**
 * Represents a computed value that automatically updates when its dependencies
 * change.
 *
 * @template T The type of the computed value.
 */
export class Computed<T> implements Dependent, Reactive<T> {
	/**
	 * Whether to force eager evaluation of the computed value. If set to true,
	 * the computed value will be recalculated immediately when invalidated.
	 */
	public forceEager = false;
	public get value(): T {
		return this.peek();
	}

	public set value(value: T) {
		this.set(value);
	}

	public addDependent(dependent: Dependent): void {
		this.dependents.add(dependent);
	}

	/**
	 * Checks if all elements in the array satisfy the predicate. Only available
	 * when T is an array.
	 *
	 * @param predicate - The predicate function to test each item in the array.
	 * @returns A new computed boolean value that is true if all items in the
	 *   array satisfy the predicate function.
	 * @throws {InvalidOperationError} If this computed is not an array.
	 */
	public every(predicate: (item: T extends Array<infer U> ? U : never) => boolean): Computed<boolean> {
		if (Array.isArray(this.peek())) {
			const exception = new Error(ONLY_ON_COMPUTED_ARRAYS);
			exception.name = "InvalidOperationError";
			Error.captureStackTrace(exception, this.every);
			throw exception;
		}

		return new Computed<boolean>((): boolean => (this.get() as Array<never>).every(predicate));
	}

	/**
	 * Creates a new computed boolean value that tests a condition on this
	 * computed's value.
	 *
	 * @param predicate - The predicate function to test the value of this
	 *   computed.
	 * @returns A new computed boolean value that is true if the predicate
	 *   function returns true for the value of this computed.
	 */
	public filter(predicate: (value: T) => boolean): Computed<boolean> {
		return new Computed<boolean>((): boolean => predicate(this.get()));
	}

	/**
	 * Filters elements in the array to create a new computed array. Only
	 * available when T is an array.
	 *
	 * @param predicate - The predicate function to test each item in the array.
	 * @returns A new computed array that contains only the items that satisfy
	 *   the predicate function.
	 */
	public filterItems(predicate: (item: T extends Array<infer U> ? U : never) => boolean): Computed<Array<T>> {
		if (Array.isArray(this.peek())) {
			const exception = new Error(ONLY_ON_COMPUTED_ARRAYS);
			exception.name = "InvalidOperationError";
			Error.captureStackTrace(exception, this.filterItems);
			throw exception;
		}

		return new Computed<Array<T>>((): Array<T> => (this.get() as Array<never>).filter(predicate));
	}

	public get(): T {
		trackDependency(this);
		return this.peek();
	}

	/**
	 * Invalidates the current value, causing a recalculation when next
	 * accessed.
	 */
	public invalidate(): void {
		if (this.isDirty) return;

		this.isDirty = true;
		this.notifyDependents();

		const { listeners } = this;
		if (listeners.size > 0 || this.forceEager) {
			const previousValue = this.cachedValue;
			const nextValue = this.peek();
			if (previousValue !== nextValue) for (const listener of listeners) listener(nextValue);
		}
	}

	/**
	 * Creates a new computed value that transforms the value of this computed.
	 *
	 * @param selector - The selector function to apply to the value of this
	 *   computed.
	 * @returns A new computed value that applies the selector function to the
	 *   value of this computed.
	 */
	public map<R>(selector: (value: T) => R): Computed<R> {
		return new Computed<R>((): R => selector(this.get()));
	}

	/**
	 * Maps each element in the array to create a new computed array. Only
	 * available when T is an array.
	 *
	 * @param selector - The selector function to apply to each item in the
	 *   array.
	 * @returns A new computed array that applies the selector function to each
	 *   item in the array.
	 */
	public mapItems<R>(selector: (item: T extends Array<infer U> ? U : never) => R): Computed<Array<R>> {
		if (Array.isArray(this.peek())) {
			const exception = new Error(ONLY_ON_COMPUTED_ARRAYS);
			exception.name = "InvalidOperationError";
			Error.captureStackTrace(exception, this.mapItems);
			throw exception;
		}

		return new Computed<Array<R>>((): Array<R> => (this.get() as Array<never>).map(selector));
	}

	public notifyDependents(): void {
		for (const dependent of [...this.dependents]) dependent.invalidate();
	}

	public onChange(callback: (value: T) => void): Cleanup {
		const { listeners } = this;
		listeners.add(callback);
		return () => listeners.delete(callback);
	}

	public peek(): T {
		if (this.isDirty) this.recompute();
		return this.cachedValue;
	}

	public read(): T {
		return this.get();
	}

	/** Recalculates the value of the computed. */
	public recompute(): void {
		clearDependencies(this, this.dependencies);

		const { dependencies, result } = track(this, this.computeFunction);
		this.dependencies = dependencies;
		this.cachedValue = result;
		this.isDirty = false;
	}

	public removeDependent(dependent: Dependent): void {
		this.dependents.delete(dependent);
	}

	/**
	 * Sets the current value.
	 *
	 * @param _newValue - The new value to set.
	 * @throws InvalidOperationError Computed values cannot be set directly.
	 */
	public set(_newValue: T): void {
		const exception = new Error("Cannot set the value of a computed. The value is derived from its dependencies.");
		exception.name = "InvalidOperationError";
		Error.captureStackTrace(exception, this.set);
		throw exception;
	}

	/**
	 * Sets whether or not to force eager evaluation of the computed value. If
	 * set to true, the computed value will be recalculated immediately when
	 * invalidated.
	 *
	 * @param forceEager - Whether to force eager evaluation.
	 */
	public setForceEager(forceEager: boolean): void {
		this.forceEager = forceEager;
		if (forceEager && this.isDirty) this.invalidate();
	}

	/**
	 * Checks if any element in the array satisfies the predicate. Only
	 * available when T is an array.
	 *
	 * @param predicate - The predicate function to test each item in the array.
	 * @returns A new computed boolean value that is true if any item in the
	 *   array satisfies the predicate.
	 */
	public some(predicate: (item: T extends Array<infer U> ? U : never) => boolean): Computed<boolean> {
		if (Array.isArray(this.peek())) {
			const exception = new Error(ONLY_ON_COMPUTED_ARRAYS);
			exception.name = "InvalidOperationError";
			Error.captureStackTrace(exception, this.some);
			throw exception;
		}

		return new Computed<boolean>((): boolean => (this.get() as Array<never>).some(predicate));
	}

	public constructor(private readonly computeFunction: () => T) {
		this.cachedValue = undefined as T;
		const _unused = this.peek();
	}

	private cachedValue!: T;
	private dependencies = new Set<Observable>();
	private readonly dependents = new Set<Dependent>();
	private isDirty = true;
	private readonly listeners = new Set<(value: T) => void>();
}
