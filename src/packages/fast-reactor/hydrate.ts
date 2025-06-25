import type { Cleanup } from "types/utility-types";
import type { Reactive } from "./types";

type BindingValue<T> = Reactive<T> | T;
type BindingTable<T> = {
	[K in keyof T]: BindingValue<T[K]>;
};

function isReactive<T>(value: unknown): value is Reactive<T> {
	return value !== null && typeof value === "object" && "value" in value;
}

/**
 * Binds properties of an object to reactive values (State or Computed) or
 * constants. Properties bound to reactive values will update automatically when
 * the reactive value changes.
 *
 * @example
 *
 * ```typescript
 * const person = {};
 * const nameState = new State("John");
 * const ageState = new State(30);
 * const fullNameComputed = new Computed(() => `${nameState.get()} Doe`);
 *
 * const cleanup = Hydrate(person, {
 * 	age: ageState,
 * 	constant: "This is a constant value", // non-reactive, just sets the value
 * 	fullName: fullNameComputed,
 * 	name: nameState,
 * });
 *
 * // Later, to clean up:
 * cleanup();
 * ```
 *
 * @template T
 * @param object - The object to hydrate with reactive bindings.
 * @param bindings - An object mapping property names to their binding sources.
 * @returns A dispose function that can be called to remove all bindings.
 */
export function hydrate<T extends object>(object: T, bindings: BindingTable<T>): Cleanup {
	const cleanups = new Array<Cleanup>();
	let length = 0;

	for (const key in bindings) {
		if (Object.hasOwn(bindings, key)) {
			const binding = bindings[key];
			if (binding && isReactive(binding)) {
				object[key as keyof T] = binding.peek() as T[keyof T];
				cleanups[length++] = binding.onChange((newValue): void => {
					object[key as keyof T] = newValue as T[keyof T];
				});
			} else object[key as keyof T] = binding as T[keyof T];
		}
	}

	return (): void => {
		for (const cleanup of cleanups) cleanup();
	};
}
