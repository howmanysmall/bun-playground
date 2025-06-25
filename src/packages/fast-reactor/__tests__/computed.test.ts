import { describe, expect, it, jest } from "bun:test";
import { Computed } from "../computed";
import { State } from "../state";

describe("FastReactor.Computed", () => {
	it("should compute initial value", () => {
		const computed = new Computed(() => 42);

		expect(computed.peek()).toBe(42);
	});

	it("should track dependencies", () => {
		const state = new State(1);
		const computed = new Computed(() => state.get() * 2);

		expect(computed.peek()).toBe(2);

		state.set(2);

		expect(computed.peek()).toBe(4);
	});

	it("should cache computed result", () => {
		const mockFunc = jest.fn(() => 42);
		const computed = new Computed(mockFunc);

		const result1 = computed.peek();
		const result2 = computed.peek();

		expect(mockFunc).toHaveBeenCalledTimes(1);
		expect(result1).toBe(42);
		expect(result2).toBe(42);
	});

	it("should recompute when dependencies change", () => {
		const state = new State(1);
		const computed = new Computed(() => state.get() * 2);

		expect(computed.peek()).toBe(2);

		state.set(5);

		expect(computed.peek()).toBe(10);
	});

	it("should track nested dependencies", () => {
		const state = new State(1);
		const intermediateComputed = new Computed(() => state.get() * 2);
		const finalComputed = new Computed(() => intermediateComputed.get() + 5);

		expect(finalComputed.peek()).toBe(7); // (1 * 2) + 5

		state.set(3);

		expect(finalComputed.peek()).toBe(11); // (3 * 2) + 5
	});

	it("should update dynamic dependencies", () => {
		const toggleState = new State(true);
		const stateA = new State(1);
		const stateB = new State(10);

		// eslint-disable-next-line test/no-conditional-in-test -- useless?
		const computed = new Computed(() => (toggleState.get() ? stateA.get() : stateB.get()));

		expect(computed.peek()).toBe(1);

		stateA.set(5);

		expect(computed.peek()).toBe(5);

		toggleState.set(false);

		expect(computed.peek()).toBe(10);

		stateA.set(20);

		expect(computed.peek()).toBe(10); // Should not change as we're using stateB now

		stateB.set(30);

		expect(computed.peek()).toBe(30);
	});

	it("should notify listeners when value changes", () => {
		const state = new State(1);
		const computed = new Computed(() => state.get() * 2);

		const mockCallback = jest.fn();
		computed.onChange(mockCallback);

		state.set(5);

		expect(mockCallback).toHaveBeenCalledWith(10);
	});

	it("should not notify listeners when computed value remains the same", () => {
		const state = new State("test");
		const computed = new Computed(() => state.get().toUpperCase());

		const mockCallback = jest.fn();
		computed.onChange(mockCallback);

		state.set("TEST"); // Will compute to 'TEST' again

		expect(mockCallback).not.toHaveBeenCalled();
	});

	it("map() should create a derived computed value", () => {
		const state = new State(2);
		const doubled = new Computed(() => state.get() * 2);
		const quadrupled = doubled.map((x) => x * 2);

		expect(quadrupled.peek()).toBe(8);

		state.set(3);

		expect(quadrupled.peek()).toBe(12);
	});

	it("value should return the current value without tracking dependencies", () => {
		const computed = new Computed(() => 42);

		expect(computed.peek()).toBe(42);
	});

	it("peek() should return the current value without tracking dependencies (deprecated, same as value)", () => {
		const computed = new Computed(() => 42);

		expect(computed.peek()).toBe(42);
	});

	it("get() should return the current value and track dependencies", () => {
		const state = new State(1);
		const intermediateComputed = new Computed(() => state.get() * 2);
		const finalComputed = new Computed(() => intermediateComputed.get() * 3);

		expect(finalComputed.peek()).toBe(6); // (1 * 2) * 3

		state.set(2);

		expect(finalComputed.peek()).toBe(12); // (2 * 2) * 3
	});

	it("forceEager=false should not recompute immediately", () => {
		const state = new State(1);

		let computedCount = 0;
		const computed = new Computed(() => {
			computedCount += 1;
			return state.get() * 2;
		});

		// Update state
		state.set(5);

		// Callback should not be called immediately due to forceEager being false
		expect(computedCount).toBe(1);

		// Force recompute manually
		computed.recompute();

		expect(computedCount).toBe(2);
	});

	it("forceEager should recompute immediately when true", () => {
		const state = new State(1);
		const computed = new Computed(() => state.get() * 2);

		// Set forceEager to true
		computed.forceEager = true;

		// Create a spy to track recomputation
		const mockFunc = jest.fn();
		computed.onChange(mockFunc);

		// Access value to establish dependencies
		expect(computed.peek()).toBe(2);

		// Update state
		state.set(5);

		// Callback should be called immediately due to forceEager
		expect(mockFunc).toHaveBeenCalledWith(10);
	});
});
