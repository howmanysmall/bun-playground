import { barplot, bench, run } from "mitata";

const SIZE = 10_000;

barplot(() => {
	bench("Array.prototype.push", () => {
		const array = new Array<number>(SIZE);
		for (let index = 0; index < SIZE; index += 1) array.push(index + 1);
		return array;
	});

	bench("length variable", () => {
		const array = new Array<number>(SIZE);
		let length = 0;
		// eslint-disable-next-line sonar/no-nested-incdec -- sybau
		for (let index = 0; index < SIZE; index += 1) array[length++] = index + 1;
		return array;
	});

	bench("length property", () => {
		const array = new Array<number>(SIZE);
		for (let index = 0; index < SIZE; index += 1) array[array.length] = index + 1;
		return array;
	});
});

await run({});
