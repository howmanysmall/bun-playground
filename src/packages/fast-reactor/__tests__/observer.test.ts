import { describe, expect, it, jest } from "bun:test";
import { Computed } from "../computed";
import { Observer } from "../observer";
import { State } from "../state";

describe("FastReactor.Observer", () => {
	it("should execute callback immediately with initial value", () => {
		const state = new State(42);
		const mockCallback = jest.fn();

		Observer.watch(state, mockCallback);

		expect(mockCallback).toHaveBeenCalledWith(42);
	});

	it("should execute callback when state value changes", () => {
		const state = new State(1);
		const mockCallback = jest.fn();

		Observer.watch(state, mockCallback);
		mockCallback.mockClear();

		state.set(2);

		expect(mockCallback).toHaveBeenCalledWith(2);
	});

	it("should execute callback when computed value changes", () => {
		const state = new State(1);
		const computed = new Computed(() => state.get() * 2);
		const mockCallback = jest.fn();

		Observer.watch(computed, mockCallback);
		mockCallback.mockClear();

		state.set(2);

		expect(mockCallback).toHaveBeenCalledWith(4);
	});

	it("should not execute callback for same value", () => {
		const state = new State("test");
		const mockCallback = jest.fn();

		Observer.watch(state, mockCallback);
		mockCallback.mockClear();

		state.set("test");

		expect(mockCallback).not.toHaveBeenCalled();
	});

	it("should stop observing when disposed", () => {
		const state = new State(1);
		const mockCallback = jest.fn();

		const observer = Observer.watch(state, mockCallback);
		mockCallback.mockClear();

		observer.dispose();
		state.set(2);

		expect(mockCallback).not.toHaveBeenCalled();
	});

	it("multiple observers can observe the same state", () => {
		const state = new State(1);

		const mockCallback1 = jest.fn();
		const mockCallback2 = jest.fn();

		Observer.watch(state, mockCallback1);
		Observer.watch(state, mockCallback2);

		mockCallback1.mockClear();
		mockCallback2.mockClear();

		state.set(2);

		expect(mockCallback1).toHaveBeenCalledWith(2);
		expect(mockCallback2).toHaveBeenCalledWith(2);
	});

	it("destroying one observer does not affect others", () => {
		const state = new State(1);

		const mockCallback1 = jest.fn();
		const mockCallback2 = jest.fn();

		const observer1 = Observer.watch(state, mockCallback1);
		Observer.watch(state, mockCallback2);

		mockCallback1.mockClear();
		mockCallback2.mockClear();

		observer1.dispose();
		state.set(2);

		expect(mockCallback1).not.toHaveBeenCalled();
		expect(mockCallback2).toHaveBeenCalledWith(2);
	});

	it("should automatically cause computed to eager update", () => {
		const state = new State(1);

		let computedCount = 0;
		const computed = new Computed(() => {
			computedCount += 1;
			return state.get() * 2;
		});

		const mockCallback = jest.fn();

		Observer.watch(computed, mockCallback);
		mockCallback.mockClear();

		expect(computed.peek()).toBe(2);
		expect(computedCount).toBe(1);

		state.set(3);

		expect(mockCallback).toHaveBeenCalledWith(6);
		expect(computedCount).toBe(2);
	});
});
