import { describe, expect, it } from "bun:test";
import { Computed, hydrate, State } from "..";

describe("FastReactor.hydrate", () => {
	it("should bind state values to object properties", () => {
		// Arrange
		const nameState = new State<string>("John");
		const object = {
			name: nameState.peek(),
		};

		// Act
		hydrate(object, {
			name: nameState,
		});

		// Assert
		expect(object.name).toBe("John");

		// Update the state
		nameState.set("Jane");

		expect(object.name).toBe("Jane");
	});

	it("should bind computed values to object properties", () => {
		// Arrange
		const firstNameState = new State<string>("John");
		const lastNameState = new State<string>("Doe");
		const fullNameComputed = new Computed(() => `${firstNameState.get()} ${lastNameState.get()}`);
		const object = {
			fullName: fullNameComputed.peek(),
		};

		// Act
		hydrate(object, {
			fullName: fullNameComputed,
		});

		// Assert
		expect(object.fullName).toBe("John Doe");

		// Update the state that the computed depends on
		firstNameState.set("Jane");

		expect(object.fullName).toBe("Jane Doe");

		lastNameState.set("Smith");

		expect(object.fullName).toBe("Jane Smith");
	});

	it("should set literal values directly without tracking", () => {
		// Arrange
		const object = {} as {
			boolean: boolean;
			constant: string;
			number: number;
			object: { foo: string };
		};

		// Act
		hydrate(object, {
			boolean: true,
			constant: "This is a constant value",
			number: 42,
			object: { foo: "bar" },
		});

		// Assert
		expect(object.constant).toBe("This is a constant value");
		expect(object.number).toBe(42);
		expect(object.boolean).toBe(true);
		expect(object.object).toEqual({ foo: "bar" });
	});

	it("should handle mixed bindings of states, computeds, and literals", () => {
		// Arrange
		const nameState = new State<string>("John");
		const ageState = new State<number>(30);
		const isAdultComputed = new Computed(() => ageState.get() >= 18);
		const object = {} as {
			age: number;
			isAdult: boolean;
			name: string;
			type: string;
		};

		// Act
		hydrate(object, {
			age: ageState,
			isAdult: isAdultComputed,
			name: nameState,
			type: "person",
		});

		// Assert
		expect(object.name).toBe("John");
		expect(object.age).toBe(30);
		expect(object.isAdult).toBe(true);
		expect(object.type).toBe("person");

		// Update states
		nameState.set("Jane");
		ageState.set(16);

		expect(object.name).toBe("Jane");
		expect(object.age).toBe(16);
		expect(object.isAdult).toBe(false);
		expect(object.type).toBe("person"); // Constant remains unchanged
	});

	it("should clean up subscriptions when dispose function is called", () => {
		// Arrange
		const nameState = new State<string>("John");
		const ageState = new State<number>(30);
		const object = {} as { age: number; name: string };

		// Act
		const cleanup = hydrate(object, {
			age: ageState,
			name: nameState,
		});

		// Verify initial values
		expect(object.name).toBe("John");
		expect(object.age).toBe(30);

		// Call dispose function
		cleanup();

		// Update states - object should no longer be updated
		nameState.set("Jane");
		ageState.set(31);

		// Assert - values should remain unchanged
		expect(object.name).toBe("John");
		expect(object.age).toBe(30);
	});

	it("should return a dispose function", () => {
		// Arrange
		const nameState = new State<string>("John");
		const object = {} as { name: string };

		// Act
		const result = hydrate(object, {
			name: nameState,
		});

		// Assert
		// eslint-disable-next-line test/prefer-strict-equal -- not helpful
		expect(typeof result).toEqual("function");
	});
});
