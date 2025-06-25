import type { Cleanup } from "types/utility-types";
import type { Reactive } from "./types";

/**
 * Represents an observer that can subscribe to changes in reactive state.
 *
 * @template T The type of the reactive value being observed.
 */
export class Observer {
	/**
	 * Creates an observer that reacts to changes in the specified reactive
	 * value.
	 *
	 * @param reactive - The reactive value to observe.
	 * @param callback - The function to call when the reactive value changes.
	 * @returns An instance of `Observer` that will call the callback with the
	 *   current value of the reactive when it changes.
	 */
	public static watch<T>(reactive: Reactive<T>, callback: (value: T) => void): Observer {
		callback(reactive.peek());
		const observer = new Observer(() => {
			callback(reactive.peek());
		});

		observer.cleanup = reactive.onChange(() => observer.callback?.());
		return observer;
	}

	/** Stops observing the reactive value. */
	public dispose(): void {
		if (this.isDestroyed) return;

		this.cleanup?.();
		this.callback = undefined;
		this.cleanup = undefined;
		this.isDestroyed = true;
	}

	protected constructor(callback: () => void) {
		this.callback = callback;
	}

	protected callback?: () => void = undefined;
	protected cleanup?: Cleanup = undefined;
	protected isDestroyed = false;
}
