import { describe, expect, it, jest } from "bun:test";
import { State } from "../state";

describe("FastReactor.State", () => {
	it("should initialize with the provided value", () => {
		const state = new State(42);

		expect(state.get()).toBe(42);
	});

	it("should notify when value changes", () => {
		const state = new State(0);
		const mockCallback = jest.fn();

		state.onChange(mockCallback);
		state.set(1);

		expect(mockCallback).toHaveBeenCalledWith(1);
	});

	it("should not notify when value is the same", () => {
		const state = new State("test");
		const mockCallback = jest.fn();

		state.onChange(mockCallback);
		state.set("test");

		expect(mockCallback).not.toHaveBeenCalled();
	});

	it("peek() should return the current value without tracking dependencies", () => {
		const state = new State(42);

		expect(state.peek()).toBe(42);

		state.set(100);

		expect(state.peek()).toBe(100);
	});

	it("map() should create a derived computed value", () => {
		const state = new State(2);
		const doubled = state.map((value) => value * 2);

		expect(doubled.get()).toBe(4);

		state.set(3);

		expect(doubled.get()).toBe(6);
	});

	it("filter() should create a boolean computed value", () => {
		const state = new State(2);
		const isEven = state.filter((value) => value % 2 === 0);

		expect(isEven.get()).toBe(true);

		state.set(3);

		expect(isEven.get()).toBe(false);
	});

	it("onChange() should return a function that removes the listener", () => {
		const state = new State(0);
		const mockCallback = jest.fn();

		const removeListener = state.onChange(mockCallback);
		state.set(1);

		expect(mockCallback).toHaveBeenCalledTimes(1);

		removeListener();
		state.set(2);

		expect(mockCallback).toHaveBeenCalledTimes(1);
	});
});
