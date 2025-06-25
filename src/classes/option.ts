import { inspect } from "bun";

export default class Option<T extends NonNullable<unknown>> {
	public static none<T extends NonNullable<unknown>>(): Option<T> {
		return new Option<T>(undefined);
	}

	public static some<T extends NonNullable<unknown>>(value: T): Option<T> {
		return new Option<T>(value);
	}

	public static wrap<T extends NonNullable<unknown>>(value?: T): Option<T> {
		return new Option<T>(value);
	}

	public static wrapNull<T extends NonNullable<unknown>>(value?: null | T): Option<T> {
		if (value === null) return Option.none<T>();
		return Option.wrap<T>(value);
	}
	public readonly isNone: boolean;
	public readonly isSome: boolean;

	public get [Symbol.toStringTag](): string {
		return "Option";
	}

	public and<U extends NonNullable<unknown>>(other: Option<U>): Option<U> {
		return this.value === undefined ? Option.none() : other;
	}

	public andThen<U extends NonNullable<unknown>>(getOther: (value: T) => Option<U>): Option<U> {
		return this.value === undefined ? Option.none() : getOther(this.value);
	}

	public contains(value: T): boolean {
		return this.isSome && this.value === value;
	}

	public equals(other: unknown): boolean {
		if (this === other) return true;

		if (other instanceof Option) {
			if (this.isSome && other.isSome) return this.unwrap() === other.unwrap();
			if (this.isNone && other.isNone) return true;
		}

		return false;
	}

	public expect(message: unknown): never | T {
		if (this.value !== undefined) return this.value;
		throw message;
	}

	public filter(predicate: (value: T) => boolean): Option<T> {
		return this.value === undefined || !predicate(this.value) ? Option.none<T>() : this;
	}

	public flatten<I extends NonNullable<unknown>>(this: Option<Option<I>>): Option<I> {
		return this.value === undefined ? Option.none() : Option.wrap(this.value.value);
	}

	public [inspect.custom](): string {
		return this.toString();
	}

	public map<U extends NonNullable<unknown>>(callback: (value: T) => U): Option<U> {
		return this.value === undefined ? Option.none<U>() : Option.some(callback(this.value));
	}

	public match<U>(onSome: (value: T) => U, onNone: () => U): U {
		return this.value === undefined ? onNone() : onSome(this.value);
	}

	public or(other: Option<T>): Option<T> {
		return this.value === undefined ? other : Option.some(this.value);
	}

	public orElse(getOther: () => Option<T>): Option<T> {
		return this.value === undefined ? getOther() : Option.some(this.value);
	}

	public [Symbol.toPrimitive](hint: "default" | "number" | "string"): string | T | undefined {
		switch (hint) {
			case "default":

			case "number": {
				return this.value;
			}
			case "string": {
				return this.toString();
			}

			default: {
				throw new Error(`Unsupported hint ${hint}`);
			}
		}
	}

	public toString(): string {
		return this.value === undefined ? "Option.none()" : `Option.some(${inspect(this.value, { colors: false })})`;
	}

	public unwrap(): T {
		return this.expect("Cannot unwrap Option.none");
	}

	public unwrapOr(defaultValue: T): T {
		return this.value ?? defaultValue;
	}

	public unwrapOrElse(orElse: () => T): T {
		return this.value ?? orElse();
	}

	public xor(optionB: Option<T>): Option<T> {
		if (this.isSome === optionB.isSome) return Option.none();
		if (this.isSome) return this;
		return optionB;
	}

	public zip<U extends NonNullable<unknown>>(optionB: Option<U>): Option<[T, U]> {
		if (this.value !== undefined && optionB.value !== undefined) return Option.some([this.value, optionB.value]);
		return Option.none();
	}

	public zipWith<U extends NonNullable<unknown>, R extends NonNullable<unknown>>(
		optionB: Option<U>,
		callback: (valueA: T, valueB: U) => R,
	): Option<R> {
		if (this.value !== undefined && optionB.value !== undefined)
			return Option.some(callback(this.value, optionB.value));
		return Option.none();
	}

	protected constructor(public readonly value?: T) {
		this.isNone = value === undefined;
		this.isSome = value !== undefined;
	}
}
