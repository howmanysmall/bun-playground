export type AnyArray<T> = Array<T> | ReadonlyArray<T>;
export type Writable<T> = { -readonly [P in keyof T]: T[P] };

export interface SuccessResult<T> {
	readonly success: true;
	readonly value: T;
}
export interface ErrorResult<E> {
	readonly error: E;
	readonly success: false;
}
export type SimpleResult<T, E> = SuccessResult<T> | ErrorResult<E>;

export const unit = Symbol("unit");
export type Unit = typeof unit;
