import { describe, expect, it, jest } from "bun:test";
import { Computed } from "../computed";
import { Observer } from "../observer";
import { ReactiveList } from "../reactive-list";

describe("FastReactor.ReactiveList", () => {
	// Basic functionality tests
	it("should initialize with the provided items", () => {
		const list = new ReactiveList([1, 2, 3]);

		expect(list.peek()).toEqual([1, 2, 3]);
		expect(list.size()).toBe(3);
	});

	it("should initialize as empty if no items are provided", () => {
		const list = new ReactiveList();

		expect(list.peek()).toEqual([]);
		expect(list.size()).toBe(0);
	});

	it("add() should append an item to the list", () => {
		const list = new ReactiveList<number>([1, 2]);
		list.add(3);

		expect(list.peek()).toEqual([1, 2, 3]);
		expect(list.size()).toBe(3);
	});

	it("insert() should insert an item at the specified index", () => {
		const list = new ReactiveList(["a", "c"]);
		list.insert(1, "b");

		expect(list.peek()).toEqual(["a", "b", "c"]);
	});

	it("remove() should remove an item from the list", () => {
		const list = new ReactiveList([1, 2, 3]);
		const result = list.remove(2);

		expect(result).toBe(true);
		expect(list.peek()).toEqual([1, 3]);
	});

	it("remove() should return false if item is not in the list", () => {
		const list = new ReactiveList([1, 2, 3]);
		const result = list.remove(4);

		expect(result).toBe(false);
		expect(list.peek()).toEqual([1, 2, 3]);
	});

	it("removeAt() should remove the item at the specified index", () => {
		const list = new ReactiveList(["a", "b", "c"]);
		const removed = list.removeAt(1);

		expect(removed).toBe("b");
		expect(list.peek()).toEqual(["a", "c"]);
	});

	it("removeAt() should return undefined for invalid index", () => {
		const list = new ReactiveList(["a", "b"]);
		const removed = list.removeAt(5);

		expect(removed).toBeUndefined();
		expect(list.peek()).toEqual(["a", "b"]);
	});

	it("update() should update an item at the specified index", () => {
		const list = new ReactiveList([1, 2, 3]);
		const result = list.update(1, 5);

		expect(result).toBe(true);
		expect(list.peek()).toEqual([1, 5, 3]);
	});

	it("update() should return false for invalid index", () => {
		const list = new ReactiveList([1, 2, 3]);
		const result = list.update(5, 10);

		expect(result).toBe(false);
		expect(list.peek()).toEqual([1, 2, 3]);
	});

	describe("clear()", () => {
		it("should remove all items (#1)", () => {
			const list = new ReactiveList([1, 2, 3]);
			list.clear();
			expect(list.peek()).toEqual([]);
		});
		it("should remove all items (#2)", () => {
			const list = new ReactiveList([1, 2, 3]);
			list.clear();
			expect(list.size()).toBe(0);
		});
	});
	// it("clear() should remove all items", () => {
	// 	const list = new ReactiveList([1, 2, 3]);
	// 	list.clear();

	// 	expect(list.peek()).toEqual([]);
	// 	expect(list.size()).toBe(0);
	// });

	it("replace() should replace all items", () => {
		const list = new ReactiveList([1, 2, 3]);
		list.replace([4, 5]);

		expect(list.peek()).toEqual([4, 5]);
	});

	it("at() should return the item at specified index", () => {
		const list = new ReactiveList(["a", "b", "c"]);

		expect(list.at(1)).toBe("b");
	});

	it("at() should return undefined for invalid index", () => {
		const list = new ReactiveList(["a", "b"]);

		expect(list.at(5)).toBeUndefined();
	});

	it("find() should return the first matching item", () => {
		const list = new ReactiveList([1, 2, 3, 4]);
		const result = list.find((item) => item % 2 === 0);

		expect(result).toBe(2);
	});

	// Reactivity tests
	it("should notify listeners when items change", () => {
		const list = new ReactiveList<number>([1, 2]);
		const mockCallback = jest.fn();

		list.onChange(mockCallback);
		list.add(3);

		expect(mockCallback).toHaveBeenCalledWith([1, 2, 3]);
	});

	it("observer should be notified when items change", () => {
		const list = new ReactiveList<string>(["a", "b"]);
		const mockCallback = jest.fn();

		Observer.watch(list, mockCallback);
		mockCallback.mockClear(); // Clear the initial call

		list.add("c");

		expect(mockCallback).toHaveBeenCalledWith(["a", "b", "c"]);
	});

	it("onChange() should return a function that removes the listener", () => {
		const list = new ReactiveList<number>([1, 2]);
		const mockCallback = jest.fn();

		const removeListener = list.onChange(mockCallback);
		list.add(3);

		expect(mockCallback).toHaveBeenCalledTimes(1);

		// Remove listener
		removeListener();
		list.add(4);

		expect(mockCallback).toHaveBeenCalledTimes(1); // Still only called once
	});

	// Integration with Computed tests
	it("map() should create a derived computed value", () => {
		const list = new ReactiveList<number>([1, 2, 3]);
		const doubled = list.map((x) => x * 2);

		expect(doubled.peek()).toEqual([2, 4, 6]);

		list.add(4);

		expect(doubled.peek()).toEqual([2, 4, 6, 8]);
	});

	it("filter() should create a boolean computed value", () => {
		const list = new ReactiveList<number>([1, 2, 3, 4]);
		const evens = list.filter((x) => x % 2 === 0);

		expect(evens.peek()).toEqual([2, 4]);

		list.add(6);

		expect(evens.peek()).toEqual([2, 4, 6]);
	});

	// Performance considerations
	it("should track dependencies properly", () => {
		const list = new ReactiveList<number>([1, 2, 3]);
		const computed = new Computed(() => {
			return list
				.get()
				.filter((x) => x > 1)
				.map((x) => x * 2);
		});

		expect(computed.peek()).toEqual([4, 6]);

		list.add(4);

		expect(computed.peek()).toEqual([4, 6, 8]);
	});

	// Tests for the new use() method
	it("use() should return items and track dependencies", () => {
		const list = new ReactiveList<number>([1, 2, 3]);

		// Create a computed that depends on list via use()
		const computed = new Computed(() => {
			/** This should track the dependency. */
			const items = list.get();
			return items.reduce((sum, item) => sum + item, 0);
		});

		expect(computed.peek()).toBe(6); // 1 + 2 + 3

		// Update the list
		list.add(4);

		// The computed should update automatically
		expect(computed.peek()).toBe(10); // 1 + 2 + 3 + 4
	});

	// Should not notify when value doesn't change meaningfully
	it("should not notify when operation doesn't change list state", () => {
		const list = new ReactiveList<number>([1, 2, 3]);
		const mockCallback = jest.fn();

		list.onChange(mockCallback);
		list.remove(4); // Not in the list, so no change

		expect(mockCallback).not.toHaveBeenCalled();
	});

	it("clear() should not notify if list is already empty", () => {
		const list = new ReactiveList<number>([]);
		const mockCallback = jest.fn();

		list.onChange(mockCallback);
		list.clear();

		expect(mockCallback).not.toHaveBeenCalled();
	});

	// Tests for item-specific listeners
	describe("onItemAdded", () => {
		it("should notify when an item is added", () => {
			const list = new ReactiveList<number>([1, 2]);
			const mockCallback = jest.fn();

			list.onItemAdded(mockCallback);
			list.add(3);

			expect(mockCallback).toHaveBeenCalledWith(3, 2); // item, index
		});

		it("should notify when an item is inserted", () => {
			const list = new ReactiveList<string>(["a", "c"]);
			const mockCallback = jest.fn();

			list.onItemAdded(mockCallback);
			list.insert(1, "b");

			expect(mockCallback).toHaveBeenCalledWith("b", 1); // item, index
		});

		it("should notify for each item when replacing items", () => {
			const list = new ReactiveList<number>([1, 2]);
			const mockCallback = jest.fn();

			list.onItemAdded(mockCallback);
			list.replace([3, 4, 5]);

			expect(mockCallback).toHaveBeenCalledTimes(3);
			expect(mockCallback).toHaveBeenNthCalledWith(1, 3, 0);
			expect(mockCallback).toHaveBeenNthCalledWith(2, 4, 1);
			expect(mockCallback).toHaveBeenNthCalledWith(3, 5, 2);
		});

		it("should return a function that removes the listener", () => {
			const list = new ReactiveList<number>([1, 2]);
			const mockCallback = jest.fn();

			const removeListener = list.onItemAdded(mockCallback);
			list.add(3);

			expect(mockCallback).toHaveBeenCalledTimes(1);

			// Remove listener
			removeListener();
			list.add(4);

			expect(mockCallback).toHaveBeenCalledTimes(1); // Still only called once
		});
	});

	describe("onItemRemoved", () => {
		it("should notify when an item is removed", () => {
			const list = new ReactiveList<number>([1, 2, 3]);
			const mockCallback = jest.fn();

			list.onItemRemoved(mockCallback);
			list.remove(2);

			expect(mockCallback).toHaveBeenCalledWith(2, 1); // item, index
		});

		it("should notify when an item is removed at index", () => {
			const list = new ReactiveList<string>(["a", "b", "c"]);
			const mockCallback = jest.fn();

			list.onItemRemoved(mockCallback);
			list.removeAt(1);

			expect(mockCallback).toHaveBeenCalledWith("b", 1); // item, index
		});

		it("should notify for each item when clearing the list", () => {
			const list = new ReactiveList<number>([1, 2, 3]);
			const mockCallback = jest.fn();

			list.onItemRemoved(mockCallback);
			list.clear();

			expect(mockCallback).toHaveBeenCalledTimes(3);
			// Items should be removed from last to first to maintain correct indexes during removal
			expect(mockCallback).toHaveBeenNthCalledWith(1, 3, 2);
			expect(mockCallback).toHaveBeenNthCalledWith(2, 2, 1);
			expect(mockCallback).toHaveBeenNthCalledWith(3, 1, 0);
		});

		it("should notify for each removed item when replacing items", () => {
			const list = new ReactiveList<number>([1, 2, 3]);
			const mockCallback = jest.fn();

			list.onItemRemoved(mockCallback);
			list.replace([4, 5]);

			expect(mockCallback).toHaveBeenCalledTimes(3);
			// Items should be removed from last to first to maintain correct indexes during removal
			expect(mockCallback).toHaveBeenNthCalledWith(1, 3, 2);
			expect(mockCallback).toHaveBeenNthCalledWith(2, 2, 1);
			expect(mockCallback).toHaveBeenNthCalledWith(3, 1, 0);
		});

		it("should return a function that removes the listener", () => {
			const list = new ReactiveList<number>([1, 2, 3]);
			const mockCallback = jest.fn();

			const removeListener = list.onItemRemoved(mockCallback);
			list.remove(2);

			expect(mockCallback).toHaveBeenCalledTimes(1);

			// Remove listener
			removeListener();
			list.remove(1);

			expect(mockCallback).toHaveBeenCalledTimes(1); // Still only called once
		});

		it("should not notify when item is not found", () => {
			const list = new ReactiveList<number>([1, 2, 3]);
			const mockCallback = jest.fn();

			list.onItemRemoved(mockCallback);
			list.remove(4); // Not in the list

			expect(mockCallback).not.toHaveBeenCalled();
		});
	});

	describe("integration tests for onItemAdded and onItemRemoved", () => {
		it("both types of listeners should work simultaneously", () => {
			const list = new ReactiveList<number>([1, 2, 3]);
			const addMock = jest.fn();
			const removeMock = jest.fn();
			const changeMock = jest.fn();

			list.onItemAdded(addMock);
			list.onItemRemoved(removeMock);
			list.onChange(changeMock);

			// Replace operation should trigger both add and remove notifications
			list.replace([2, 3, 4]);

			// Should have 3 removes (1, 2, 3) and 3 adds (2, 3, 4)
			expect(removeMock).toHaveBeenCalledTimes(3);
			expect(addMock).toHaveBeenCalledTimes(3);
			expect(changeMock).toHaveBeenCalledTimes(1);

			// Check that 1 was removed
			expect(removeMock).toHaveBeenCalledWith(1, 0);

			// Check that 4 was added
			expect(addMock).toHaveBeenCalledWith(4, 2);
		});
	});
});
