import { barplot, bench, type k_statefull, run } from "mitata";

function fibonacci(n: number): number {
	if (n <= 1) return n;

	let a = 0;
	let b = 1;
	for (let index = 2; index <= n; index += 1) [a, b] = [b, a + b];
	return b;
}

function fibonacciRecursive(n: number): number {
	if (n <= 1) return n;
	return fibonacciRecursive(n - 1) + fibonacciRecursive(n - 2);
}

function fibonacciIterative(n: number): number {
	if (n <= 1) return n;

	let a = 0;
	let b = 1;
	for (let index = 2; index <= n; index += 1) {
		const temporary = b;
		b += a;
		a = temporary;
	}

	return b;
}

type Stateful = k_statefull<{
	readonly n: number;
}>;

barplot(() => {
	bench("recursive fibonacci (20)", () => {
		fibonacciRecursive(20);
	});

	bench("iterative fibonacci (20)", () => {
		fibonacciIterative(20);
	});

	bench("fibonacci($n)", function* (state: Stateful) {
		const n = state.get("n");
		yield (): number => fibonacci(n);
	}).range("n", 10, 40, 2);
});

await run({});
