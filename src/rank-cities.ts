#!/usr/bin/env bun

import { confirm, number, select } from "@inquirer/prompts";
import {
	type INIStringifyOptions,
	type JSON5StringifyOptions,
	type JSONStringifyOptions,
	stringifyINI,
	stringifyJSON,
	stringifyJSON5,
	stringifyJSONC,
	stringifyTOML,
	stringifyYAML,
	type YAMLStringifyOptions,
} from "confbox";
import type { JSONCStringifyOptions } from "confbox/jsonc";
import FileType from "meta/file-type";
import { z as zod } from "zod/v4";
import { fromError } from "zod-validation-error/v4";

function validateApiKey(apiKey: string | undefined): string {
	if (!apiKey) {
		console.error("⚠️  Please set CENSUS_API_KEY in your .env");
		process.exit(1);
	}
	return apiKey;
}

const CENSUS_API_KEY = validateApiKey(Bun.env.CENSUS_API_KEY);

const isMsaData = zod
	.object({
		medianIncome: zod.number(),
		medianRent: zod.number(),
		name: zod.string(),
		population: zod.int(),
	})
	.readonly();
type MsaData = zod.infer<typeof isMsaData>;

interface AffordabilityRank {
	readonly actualMedianRent: number;
	readonly affordableMonthlyRent: number;
	readonly medianMonthlyIncome: number;
	readonly name: string;
	rank: number;
	/**
	 * The percentage of the 30% median monthly income that goes to median monthly rent.
	 * A value of 100 means rent consumes exactly 30% of median income.
	 * A value > 100 means rent is more than 30% of median income (less affordable).
	 */
	readonly rentToIncomeRatio: number;
}

const limit = await number({
	default: 100,
	message: "How many cities to fetch?",
	min: 1,
	required: true,
	step: 1,
});
const affordableHousingPercentageInteger = await number({
	default: 30,
	max: 100,
	message: 'What is the threshold of income considered "affordable" for housing? [0-100]',
	min: 0,
	required: true,
});
const affordableHousingPercentage = affordableHousingPercentageInteger / 100;

const CENSUS_API_YEAR = 2022;
const CENSUS_DATA_SOURCE = "acs/acs5";

const VARIABLES = {
	MEDIAN_GROSS_RENT: "B25058_001E",
	MEDIAN_HOUSEHOLD_INCOME: "B19013_001E",
	NAME: "NAME",
	TOTAL_POPULATION: "B01003_001E", // Median rent for renter-occupied housing units
};

function buildCensusApiUrl(): URL {
	const url = new URL(`https://api.census.gov/data/${CENSUS_API_YEAR}/${CENSUS_DATA_SOURCE}`);
	url.searchParams.set(
		"get",
		`${VARIABLES.NAME},${VARIABLES.TOTAL_POPULATION},${VARIABLES.MEDIAN_HOUSEHOLD_INCOME},${VARIABLES.MEDIAN_GROSS_RENT}`,
	);
	url.searchParams.set("for", "metropolitan statistical area/micropolitan statistical area:*");
	url.searchParams.set("key", CENSUS_API_KEY);
	return url;
}

const isMsaDataArray = zod.array(zod.array(zod.nullable(zod.string())));

async function fetchMsaDataAsync(url: URL): Promise<Array<MsaData>> {
	const response = await Bun.fetch(url);
	if (!response.ok) {
		const text = await response.text();
		const error = new Error(`Census API request failed with status ${response.status}: ${text}`);
		Error.captureStackTrace(error, fetchMsaDataAsync);
		throw error;
	}

	const raw = await response.json();
	const result = await isMsaDataArray.safeParseAsync(raw);
	if (!result.success) throw fromError(result.error);

	const rawData = result.data;
	const [, ...dataRows] = rawData;

	return dataRows
		.map((row): MsaData | undefined => {
			const [name, populationString, incomeString, rentString] = row;
			if (!name?.includes("Metro Area") || !populationString || !incomeString || !rentString) return undefined;

			const population = Number.parseInt(populationString, 10);
			const medianIncome = Number.parseInt(incomeString, 10);
			const medianRent = Number.parseInt(rentString, 10);
			if (population <= 0 || medianIncome <= 0 || medianRent <= 0) return undefined;

			return {
				medianIncome,
				medianRent,
				name: name.replace(" Metro Area", "").trim(),
				population,
			};
		})
		.filter((item): item is MsaData => item !== undefined);
}

function calculateAffordability(metroStatisticalAreas: Array<MsaData>): Array<AffordabilityRank> {
	return metroStatisticalAreas.map(({ medianIncome, medianRent, name }) => {
		const medianMonthlyIncome = medianIncome / 12;
		const affordableMonthlyRent = medianMonthlyIncome * affordableHousingPercentage;
		const rentToIncomeRatio = (medianRent / medianMonthlyIncome) * 100;

		return {
			actualMedianRent: medianRent,
			affordableMonthlyRent,
			medianMonthlyIncome,
			name,
			rank: 0,
			rentToIncomeRatio,
		};
	});
}

type RankedCities = Array<Omit<AffordabilityRank, "rank">>;

function displayResults(rankedCities: RankedCities): void {
	console.log("\n--- Top 100 US Cities Ranked by Rent Affordability (Most to Least Expensive) ---");
	console.log(
		`This ranks cities by how much the median rent exceeds ${affordableHousingPercentageInteger}% of the median monthly income.\n`,
	);

	const tableHeader = [
		"Rank".padEnd(5),
		"City Market".padEnd(50),
		"Rent Burden (%)".padEnd(20),
		`Affordable Rent (${affordableHousingPercentageInteger}%)`.padEnd(25),
		"Actual Median Rent".padEnd(20),
	].join("");
	console.log(tableHeader);
	console.log("=".repeat(tableHeader.length));
	console.log(
		rankedCities
			.map(({ actualMedianRent, affordableMonthlyRent, name, rentToIncomeRatio }, index) => {
				return [
					`${index + 1}`.padEnd(5),
					name.slice(0, 48).padEnd(50),
					rentToIncomeRatio.toFixed(1).padStart(7, " ") + "%".padEnd(13),
					`$${affordableMonthlyRent.toFixed(0)}`.padEnd(25),
					`$${actualMedianRent.toFixed(0)}`.padEnd(20),
				].join("");
			})
			.join("\n"),
	);
}

type FormatOptions = {
	[FileType.Ini]: INIStringifyOptions;
	[FileType.Json]: JSONStringifyOptions;
	[FileType.Json5]: JSON5StringifyOptions;
	[FileType.JsonC]: JSONCStringifyOptions;
	[FileType.Toml]: undefined;
	[FileType.Yaml]: YAMLStringifyOptions;
};

type MetadataType = {
	readonly [fileType in FileType]: {
		readonly promptExtensionsAsync: () => Promise<FormatOptions[fileType]>;
		readonly getStringAsync: (rankedCities: RankedCities, options: FormatOptions[fileType]) => Promise<string>;
	};
};

const FileTypeMeta: MetadataType = {
	[FileType.Ini]: {
		getStringAsync: async (rankedCities: RankedCities, options: INIStringifyOptions): Promise<string> => {
			const options: INIStringifyOptions = {
				align: false,
				sort: false,
				whitespace: true,
			};

			return stringifyINI(rankedCities, {
				align: false,
				sort: false,
				whitespace: true,
			});
		},
		promptExtensionsAsync: async (): Promise<INIStringifyOptions> => {
			const whitespace = await confirm({
				default: true,
				message: "Do you want to insert spaces before & after `=` characters?",
			});
			const align = await confirm({
				default: false,
				message: "Do you want to align the `=` character for each section?",
			});

			return {
				align,
				whitespace,
			};
		},
	},
	[FileType.Json]: async (rankedCities: RankedCities): Promise<string> => {
		return stringifyJSON(rankedCities, {
			indent: 4,
			preserveIndentation: true,
			preserveWhitespace: true,
		});
	},
	[FileType.Json5]: async (rankedCities: RankedCities): Promise<string> => {
		return stringifyJSON5(rankedCities, {
			indent: 4,
			preserveIndentation: true,
			preserveWhitespace: true,
			quote: '"',
		});
	},
	[FileType.JsonC]: async (rankedCities: RankedCities): Promise<string> => {
		return stringifyJSONC(rankedCities, {
			indent: 4,
			preserveIndentation: true,
			preserveWhitespace: true,
		});
	},
	[FileType.Toml]: async (rankedCities: RankedCities): Promise<string> => {
		return stringifyTOML(rankedCities);
	},
	[FileType.Yaml]: async (rankedCities: RankedCities): Promise<string> => {
		return stringifyYAML(rankedCities, {
			indent: 4,
			preserveIndentation: true,
			preserveWhitespace: true,
		});
	},
};

async function writeResultsAsync(rankedCities: RankedCities): Promise<void> {
	const shouldWrite = await confirm({
		default: true,
		message: "Write results to file system?",
	});
	if (!shouldWrite) return;

	const fileType = await select<FileType>({
		choices: [FileType.Json, FileType.JsonC, FileType.Json5, FileType.Yaml, FileType.Toml, FileType.Ini],
		default: FileType.Json,
		loop: true,
		message: "What format to write?",
	});
}

async function rankCitiesByAffordabilityAsync(): Promise<void> {
	const url = buildCensusApiUrl();

	try {
		const parsedData = await fetchMsaDataAsync(url);
		const topMsas = parsedData.sort((a, b) => b.population - a.population).slice(0, limit);

		const rankedCities = calculateAffordability(topMsas);
		rankedCities.sort((a, b) => b.rentToIncomeRatio - a.rentToIncomeRatio);

		displayResults(rankedCities);
	} catch (error) {
		console.error("An unexpected error occurred:", error);
		process.exit(1);
	}
}

async function mainAsync(): Promise<void> {
	console.log(`Fetching the ${limit} largest cities in the US...`);
	await rankCitiesByAffordabilityAsync();
}

if (import.meta.main) mainAsync().catch(console.error);
