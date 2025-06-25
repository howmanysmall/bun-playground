import { describe, expect, it } from "bun:test";
import { Computed, Observer, ReactiveList, State } from "..";

const ALMOST_VICTORY = "Almost Victory";
const HELL_JANE = "Hello, Jane!";
const HELLO_JANE_DOE = "Hello, Jane Doe!";
const HELLO_JANE_SMITH = "Hello, Jane Smith!";

describe("Integration tests", () => {
	it("complex dependency chain should update correctly", () => {
		const firstName = new State("John");
		const lastName = new State("Doe");
		const showFullName = new State(true);

		const fullName = new Computed(() => `${firstName.get()} ${lastName.get()}`);
		const displayName = new Computed(() => (showFullName.get() ? fullName.get() : firstName.get()));
		const greeting = new Computed(() => `Hello, ${displayName.get()}!`);

		const updates: Array<string> = [];
		Observer.watch(greeting, (value) => updates.push(value));

		updates.length = 0;
		firstName.set("Jane");

		expect(updates).toEqual([HELLO_JANE_DOE]);

		lastName.set("Smith");

		expect(updates).toEqual([HELLO_JANE_DOE, HELLO_JANE_SMITH]);

		showFullName.set(false);

		expect(updates).toEqual([HELLO_JANE_DOE, HELLO_JANE_SMITH, HELL_JANE]);

		lastName.set("Johnson");

		expect(updates).toEqual([HELLO_JANE_DOE, HELLO_JANE_SMITH, HELL_JANE]);

		showFullName.set(true);

		expect(updates).toEqual([HELLO_JANE_DOE, HELLO_JANE_SMITH, HELL_JANE, "Hello, Jane Johnson!"]);
	});

	it("should handle circular dependencies gracefully", () => {
		const count = new State(0);
		const doubled = new Computed(() => count.get() * 2);

		expect(count.peek()).toBe(0);
		expect(doubled.peek()).toBe(0);

		count.set(5);

		expect(doubled.peek()).toBe(10);
	});

	describe("reactiveList Integration", () => {
		it("should track complex dependency chains", () => {
			const entities = new ReactiveList<{ health: number; id: number; type: string }>([
				{ id: 1, health: 100, type: "player" },
				{ id: 2, health: 50, type: "enemy" },
				{ id: 3, health: 75, type: "enemy" },
			]);

			const enemies = new Computed(() => entities.get().filter((e) => e.type === "enemy"));

			const averageEnemyHealth = new Computed(() => {
				const enemyList = enemies.get();
				if (enemyList.length === 0) return 0;

				const total = enemyList.reduce((sum, e) => sum + e.health, 0);
				return total / enemyList.length;
			});

			const gameStatus = new Computed(() => {
				const enemyList = enemies.get();
				if (enemyList.length === 0) return "Victory";
				if (averageEnemyHealth.get() < 30) return ALMOST_VICTORY;
				return "In Progress";
			});

			expect(enemies.peek()).toHaveLength(2);
			expect(averageEnemyHealth.peek()).toBe(62.5);
			expect(gameStatus.peek()).toBe("In Progress");

			const updates: Array<string> = [];
			Observer.watch(gameStatus, (value) => {
				updates.push(value);
			});
			updates.length = 0;

			entities.update(1, { id: 2, health: 20, type: "enemy" });
			entities.update(2, { id: 3, health: 25, type: "enemy" });

			expect(averageEnemyHealth.peek()).toBe(22.5);
			expect(updates).toEqual([ALMOST_VICTORY]);

			entities.replace([{ id: 1, health: 100, type: "player" }]);

			expect(averageEnemyHealth.peek()).toBe(0);
			expect(updates).toEqual([ALMOST_VICTORY, "Victory"]);
		});

		it("should handle operations on item objects correctly", () => {
			interface Vector2 {
				x: number;
				y: number;
			}
			interface Entity {
				id: number;
				position: Vector2;
			}

			const entities = new ReactiveList<Entity>([
				{ id: 1, position: { x: 0, y: 0 } },
				{ id: 2, position: { x: 5, y: 5 } },
			]);

			const distances = new Computed(() =>
				entities.get().map((entity) => {
					const { x, y } = entity.position;
					return {
						id: entity.id,
						distance: Math.sqrt(x ** 2 + y ** 2),
					};
				}),
			);

			const withinRange = new Computed(() =>
				distances
					.get()
					.filter((item) => item.distance < 10)
					.map((item) => item.id),
			);

			expect(withinRange.peek()).toEqual([1, 2]);

			entities.update(1, {
				id: 2,
				position: { x: 20, y: 20 },
			});

			expect(withinRange.peek()).toEqual([1]);

			entities.add({
				id: 3,
				position: { x: 3, y: 4 },
			});

			expect(withinRange.peek()).toEqual([1, 3]);
		});
	});
});
