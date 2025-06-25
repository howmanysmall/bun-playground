import type { AnyArray, Cleanup } from "types/utility-types";
import { Computed } from "./computed";
import { trackDependency } from "./dependency-tracker";
import type { ArrayPredicate, Dependent, Reactive } from "./types";

function notifyDependents(dependents: Set<Dependent>): void {
	for (const dependent of [...dependents]) dependent.invalidate();
}
function notifyItemAdded<T>(addListeners: Set<(value: T, index: number) => void>, value: T, index: number): void {
	for (const listener of addListeners) listener(value, index);
}
function notifyItemRemoved<T>(removeListeners: Set<(value: T, index: number) => void>, value: T, index: number): void {
	for (const listener of removeListeners) listener(value, index);
}

function safeNotifyItemAdded<T>(addListeners: Set<(value: T, index: number) => void>, value: T, index: number): void {
	if (addListeners.size > 0) notifyItemAdded(addListeners, value, index);
}
function safeNotifyItemRemoved<T>(
	removeListeners: Set<(value: T, index: number) => void>,
	value: T,
	index: number,
): void {
	if (removeListeners.size > 0) notifyItemRemoved(removeListeners, value, index);
}

function addListener<T>(set: Set<T>, callback: T): Cleanup {
	set.add(callback);
	return () => set.delete(callback);
}
function onItemsChanged<T>(
	dependents: Set<Dependent>,
	listeners: Set<(value: Array<T>) => void>,
	items: Array<T>,
): void {
	if (dependents.size > 0) notifyDependents(dependents);
	if (listeners.size > 0) for (const listener of listeners) listener(items);
}

/**
 * Represents a reactive list that notifies dependents when its items change.
 *
 * @template T The type of items in the list.
 */
export class ReactiveList<T extends NonNullable<unknown>> implements Reactive<Array<T>> {
	public get length(): number {
		trackDependency(this);
		return this.items.length;
	}

	public get value(): Array<T> {
		return this.peek();
	}

	public set value(items: AnyArray<T>) {
		this.set(items);
	}

	/**
	 * Adds an item to the end of the list.
	 *
	 * @param value - The item to add to the list.
	 */
	public add(value: T): void {
		const { addListeners, dependents, items, listeners } = this;
		const index = items.length;
		items[index] = value;
		safeNotifyItemAdded(addListeners, value, index);
		onItemsChanged(dependents, listeners, items);
	}

	public addDependent(dependent: Dependent): void {
		this.dependents.add(dependent);
	}

	public at(index: number): T | undefined {
		trackDependency(this);
		return this.items[index];
	}

	public clear(): void {
		const { items } = this;
		if (items.length <= 0) return;

		const { dependents, listeners, removeListeners } = this;
		if (removeListeners.size > 0) {
			const clone = [...items];
			for (let index = clone.length; index > 0; index -= 1) {
				const value = clone[index - 1];
				if (value !== undefined) notifyItemRemoved(removeListeners, value, index - 1);
			}
		}

		const newItems = new Array<T>();
		this.items = newItems;
		onItemsChanged(dependents, listeners, newItems);
	}

	public contains(value: T): boolean {
		trackDependency(this);
		return this.items.includes(value);
	}

	public filter(predicate: ArrayPredicate<T, boolean | undefined>): Computed<Array<T>> {
		return new Computed<Array<T>>(() => this.get().filter(predicate));
	}

	public find(predicate: (value: T, index: number, array: ReadonlyArray<T>) => boolean): T | undefined;
	public find(predicate: (value: T, index: number, array: ReadonlyArray<T>) => value is T): T | undefined {
		trackDependency(this);
		return this.items.find(predicate);
	}

	public get(): Array<T> {
		trackDependency(this);
		return [...this.items];
	}

	public insert(index: number, value: T): void {
		const { addListeners, dependents, items, listeners } = this;

		if (index < 0 || index > items.length) throw new Error(`Index out of bounds: ${index}`);
		items.splice(index, 0, value);

		safeNotifyItemAdded(addListeners, value, index);
		onItemsChanged(dependents, listeners, items);
	}

	public map<R>(selector: ArrayPredicate<T, R>): Computed<Array<R>> {
		return new Computed<Array<R>>(() => this.get().map(selector));
	}

	public notifyDependents(): void {
		notifyDependents(this.dependents);
	}

	public onChange(callback: (value: Array<T>) => void): Cleanup {
		return addListener(this.listeners, callback);
	}

	public onItemAdded(callback: (value: T, index: number) => void): Cleanup {
		return addListener(this.addListeners, callback);
	}

	public onItemRemoved(callback: (value: T, index: number) => void): Cleanup {
		return addListener(this.removeListeners, callback);
	}

	public onItemsChanged(): void {
		onItemsChanged(this.dependents, this.listeners, this.items);
	}

	public peek(): Array<T> {
		return [...this.items];
	}

	public pop(): T | undefined {
		const { dependents, items, listeners, removeListeners } = this;
		const { length } = items;
		if (length === 0) return undefined;

		const item = items[length - 1]!;
		delete items[length - 1];

		safeNotifyItemRemoved(removeListeners, item, length - 1);
		onItemsChanged(dependents, listeners, items);
		return item;
	}

	public read(): Array<T> {
		trackDependency(this);
		return [...this.items];
	}

	public remove(value: T): boolean {
		const { dependents, items, listeners, removeListeners } = this;
		const index = items.indexOf(value);
		if (index === -1) return false;

		items.splice(index, 1);
		safeNotifyItemRemoved(removeListeners, value, index);
		onItemsChanged(dependents, listeners, items);
		return true;
	}

	public removeAt(index: number): T | undefined {
		const { dependents, items, listeners, removeListeners } = this;
		if (index < 0 || index >= items.length) return undefined;

		const item = items[index];
		if (item === undefined) return undefined;

		items.splice(index, 1);
		safeNotifyItemRemoved(removeListeners, item, index);
		onItemsChanged(dependents, listeners, items);
		return item;
	}

	public removeDependent(dependent: Dependent): void {
		this.dependents.delete(dependent);
	}

	public replace(items: AnyArray<T>): void {
		this.set(items);
	}

	public set(items: AnyArray<T>): void {
		const { addListeners, dependents, listeners, removeListeners } = this;
		if (removeListeners.size > 0) {
			const previousItems = [...this.items];
			for (let index = previousItems.length; index > 0; index -= 1) {
				const value = previousItems[index - 1];
				if (value !== undefined) notifyItemRemoved(removeListeners, value, index - 1);
			}
		}

		const newItems = [...items];
		this.items = newItems;

		if (addListeners.size > 0) {
			let index = 0;
			for (const item of newItems) {
				notifyItemAdded(addListeners, item, index);
				index += 1;
			}
		}

		onItemsChanged(dependents, listeners, newItems);
	}

	public shift(): T | undefined {
		trackDependency(this);
		const { dependents, items, listeners, removeListeners } = this;
		const value = items.shift();
		if (value === undefined) return undefined;

		safeNotifyItemRemoved(removeListeners, value, 0);
		onItemsChanged(dependents, listeners, items);
		return value;
	}

	public size(): number {
		trackDependency(this);
		return this.items.length;
	}

	public update(index: number, value: T): boolean {
		const { dependents, items, listeners } = this;
		if (index < 0 || index >= items.length) return false;

		items[index] = value;
		onItemsChanged(dependents, listeners, items);
		return true;
	}

	public write(items: AnyArray<T>): void {
		this.set(items);
	}

	public constructor(initialItems?: AnyArray<T>) {
		this.items = initialItems ? [...initialItems] : [];
	}

	protected readonly addListeners = new Set<(value: T, index: number) => void>();
	protected readonly dependents = new Set<Dependent>();
	protected items: Array<T>;
	protected readonly listeners = new Set<(value: Array<T>) => void>();
	protected readonly removeListeners = new Set<(value: T, index: number) => void>();
}
