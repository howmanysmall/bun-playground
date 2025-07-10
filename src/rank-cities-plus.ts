#!/usr/bin/env bun

import { checkbox, number, select } from "@inquirer/prompts";
import chalk from "chalk";
import LocationFilterMode from "meta/location-filter-mode";
import OutputType from "meta/output-type";
import UsaRegion from "meta/usa-region";
import UsaState from "meta/usa-state";
import UsaStateMeta from "meta/usa-state-meta";
import { State } from "packages/fast-reactor";
import type { AnyArray } from "types/utility-types";
import logger from "utilities/logger";
import requireEnvironment from "utilities/require-environment";
import { z as zod } from "zod/v4";

const CENSUS_API_KEY = requireEnvironment("CENSUS_API_KEY");
const BLS_API_KEY = requireEnvironment("BLS_API_KEY", true);

interface RankingWeights {
	readonly diversity: number;
	readonly homeAffordability: number;
	readonly jobMarket: number;
	readonly rentAffordability: number;
	readonly wageGrowth: number;
}

interface LocationFilter {
	readonly locationFilterMode: LocationFilterMode;
	readonly locationFilterValue: string | undefined;
}

interface PromptSettings {
	readonly affordablePercentage: number;
	readonly limit: number;
	readonly locationFilter: LocationFilter;
	readonly outputType: OutputType;
	readonly weights: RankingWeights;
}

interface CensusApiData {
	readonly medianAge: number;
	readonly medianHomeValue: number;
	readonly medianIncome: number;
	readonly medianRent: number;
	readonly name: string;
	readonly population: number;
	readonly raceAsian: number;
	readonly raceBlack: number;
	readonly raceHispanic: number;
	readonly raceOther: number;
	readonly raceWhite: number;
}
interface CityData {
	/** The final weighted score for ranking. */
	readonly compositeScore: number;
	readonly costOfLivingIndex: number;
	readonly diversityIndex: number;
	readonly homeValueToIncomeRatio: number;
	readonly medianHomeValue: number;
	readonly medianIncome: number;
	readonly name: string;
	readonly population: number;
	readonly region: string;
	/** Calculated affordability metrics. */
	readonly rentToIncomeRatio: number;
	readonly state: string;
	readonly unemploymentRate: number;
	readonly wageGrowth: number;
}

type CostOfLivingDataMap = Map<string, number>;
type UnemploymentDataMap = Map<string, number>;

const isCensusResponse = zod.array(zod.array(zod.nullable(zod.string())));
const isBlsSeries = zod.object({
	data: zod.array(zod.object({ value: zod.string() })),
	seriesID: zod.string(),
});
const isBlsResponse = zod.object({
	Results: zod.object({ series: zod.array(isBlsSeries) }),
});

const settingsState = new State<PromptSettings>({
	affordablePercentage: 30,
	limit: 50,
	locationFilter: {
		locationFilterMode: LocationFilterMode.None,
		locationFilterValue: undefined,
	},
	outputType: OutputType.CliTable3,
	weights: {
		diversity: 10,
		homeAffordability: 25,
		jobMarket: 20,
		rentAffordability: 30,
		wageGrowth: 15,
	},
});

function reduceWeights(sum: number, weight: number): number {
	return sum + weight;
}
async function getPartialWeightsAsync(): Promise<Partial<RankingWeights>> {
	return {
		diversity: await number({ default: 10, max: 100, message: "Weight for Diversity:", min: 0 }),
		homeAffordability: await number({
			default: 25,
			max: 100,
			message: "Weight for Home Affordability:",
			min: 0,
		}),
		jobMarket: await number({
			default: 20,
			max: 100,
			message: "Weight for Job Market (Unemployment):",
			min: 0,
		}),
		rentAffordability: await number({
			default: 30,
			max: 100,
			message: "Weight for Rent Affordability:",
			min: 0,
		}),
		wageGrowth: await number({ default: 15, max: 100, message: "Weight for 5-Year Wage Growth:", min: 0 }),
	};
}
function isValidWeights(
	partialWeights: Partial<RankingWeights>,
	totalWeight: number,
): partialWeights is RankingWeights {
	return totalWeight === 100;
}
async function promptForWeightsAsync(): Promise<RankingWeights> {
	logger.info(chalk.cyan("\n--- Customize Ranking Weights ---"));
	logger.info("Assign a weight (0-100) to each category. The total must sum to 100.");

	let totalWeight = 0;

	while (true) {
		if (totalWeight > 0)
			logger.info(
				chalk.yellow(`\nWeights must sum to 100, but currently sum to ${totalWeight}. Please try again.`),
			);

		const weights = await getPartialWeightsAsync();
		totalWeight = Object.values(weights).reduce(reduceWeights, 0);
		if (isValidWeights(weights, totalWeight)) return weights;
	}
}

const stateToRegionMap = {} as Record<UsaState, UsaRegion>;
for (const usaState of Object.values(UsaState)) stateToRegionMap[usaState] = UsaStateMeta[usaState].usaRegion;

const stringToUsaStateMap = new Map<string, UsaState>(Object.entries(UsaState));
const stringToUsaRegionMap = new Map<string, UsaRegion>(Object.entries(UsaRegion));

const isUsaState = zod.enum(UsaState);
const isUsaRegion = zod.enum(UsaRegion);

interface Choice<T> {
	readonly checked?: boolean;
	readonly description?: string;
	readonly disabled?: boolean | string;
	readonly name?: string;
	readonly short?: string;
	readonly value: T;
}

// eslint-disable-next-line max-lines-per-function -- necessary
async function promptUserForOptionsAsync(): Promise<void> {
	const limit = await number({
		default: 50,
		message: "How many cities to fetch?",
		min: 1,
		required: true,
	});

	const affordablePercentage = await number({
		default: 30,
		max: 100,
		message: 'What percentage of income is "affordable" for housing?',
		min: 1,
		required: true,
	});
	const outputType = await select<OutputType>({
		choices: Object.values(OutputType).map((value) => ({ name: value, value })),
		default: OutputType.CliTable3,
		message: "How would you like to display the results?",
	});

	const locationFilterMode = await select<LocationFilterMode>({
		choices: Object.values(LocationFilterMode).map((value) => ({ name: value, value })),
		default: LocationFilterMode.None,
		message: "Filter cities by location?",
	});

	let locationFilterValue: string | undefined;
	if (locationFilterMode === LocationFilterMode.State) {
		const choices = Object.entries(UsaState).map(([name, value]): Choice<UsaState> => ({ name, value }));
		locationFilterValue = await checkbox<UsaState>({
			choices,
			message: "Select state(s):",
			required: true,
		}).then((states) => states.join(","));
	} else if (locationFilterMode === LocationFilterMode.Region) {
		locationFilterValue = await select<UsaRegion>({
			choices: Object.entries(UsaRegion).map(([name, value]): Choice<UsaRegion> => ({ name, value })),
			message: "Select a region:",
		});
	}

	const weights = await promptForWeightsAsync();

	settingsState.set({
		affordablePercentage,
		limit,
		locationFilter: { locationFilterMode, locationFilterValue },
		outputType,
		weights,
	});
}

// fetching

function buildCensusApiUrl(year: number, variables: AnyArray<string>): URL {
	const url = new URL(`https://api.census.gov/data/${year}/acs/acs5`);
	url.searchParams.set("get", variables.join(","));
	url.searchParams.set("for", "metropolitan statistical area/micropolitan statistical area:*");
	url.searchParams.set("key", CENSUS_API_KEY);
	return url;
}
