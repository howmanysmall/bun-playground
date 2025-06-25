#!/usr/bin/env bun

import { confirm, number, select } from "@inquirer/prompts";
import chalk from "chalk";
import CliTable3 from "cli-table3";
import { stringifyINI, stringifyJSON, stringifyJSON5, stringifyJSONC, stringifyTOML, stringifyYAML } from "confbox";
import FileType from "meta/file-type";
import { State } from "packages/fast-reactor";
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
	readonly rank: number;
	/**
	 * The percentage of the 30% median monthly income that goes to median monthly rent.
	 * A value of 100 means rent consumes exactly 30% of median income.
	 * A value > 100 means rent is more than 30% of median income (less affordable).
	 */
	readonly rentToIncomeRatio: number;
}

// biome-ignore lint/suspicious/noConstEnum: not built
const enum OutputType {
	ConsoleTable = "console.table",
	CliTable3 = "cli-table3",
}

interface PromptResults {
	readonly affordableHousingPercentageInteger: number;
	readonly limit: number;
	readonly outputType: OutputType;
}

const promptResultState = new State<PromptResults>({
	affordableHousingPercentageInteger: 30,
	limit: 100,
	outputType: OutputType.CliTable3,
});
const affordableHousingPercentageState = promptResultState.map((state): number =>
	Math.max((state.affordableHousingPercentageInteger ?? 0) / 100, 1),
);

async function promptUserForOptionsAsync(): Promise<void> {
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
	const outputType = await select<OutputType>({
		choices: [OutputType.ConsoleTable, OutputType.CliTable3],
		default: OutputType.CliTable3,
		message: "How would you like to display the results?",
	});

	promptResultState.value = {
		affordableHousingPercentageInteger,
		limit,
		outputType,
	};
}

const CENSUS_API_YEAR = 2023;
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
	const affordableHousingPercentage = affordableHousingPercentageState.get();

	return metroStatisticalAreas.map(({ medianIncome, medianRent, name }): AffordabilityRank => {
		const medianMonthlyIncome = medianIncome / 12;
		const affordableMonthlyRent = medianMonthlyIncome * affordableHousingPercentage;
		const rentToIncomeRatio = (medianRent / affordableMonthlyRent) * 100;

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
interface RankedCity {
	readonly Rank: string;
	readonly "Actual Median Rent": string;
	readonly "Affordable Rent": string;
	readonly "City Market": string;
	readonly "Rent Burden (%)": string;
}

function displayResults(rankedCities: RankedCities): void {
	const { affordableHousingPercentageInteger, outputType } = promptResultState.get();

	console.log("\n--- Top 100 US Cities Ranked by Rent Affordability (Most to Least Expensive) ---");
	console.log(
		`This ranks cities by how much the median rent exceeds ${affordableHousingPercentageInteger}% of the median monthly income.\n`,
	);

	switch (outputType) {
		case OutputType.ConsoleTable:
			console.table(
				rankedCities.map(
					({ actualMedianRent, affordableMonthlyRent, name, rentToIncomeRatio }, index): RankedCity => {
						return {
							"Actual Median Rent": `$${actualMedianRent.toFixed(0)}`,
							"Affordable Rent": `$${affordableMonthlyRent.toFixed(0)}`,
							"City Market": name,
							Rank: `${index + 1}`,
							"Rent Burden (%)": `${rentToIncomeRatio.toFixed(1)}%`,
						};
					},
				),
				["City Market", "Rent Burden (%)", "Affordable Rent", "Actual Median Rent"],
			);
			break;

		case OutputType.CliTable3: {
			const bold = chalk.bold;
			const cliTable = new CliTable3({
				head: [
					bold("Rank"),
					bold("City Market"),
					bold("Rent Burden (%)"),
					bold(`Affordable Rent (${affordableHousingPercentageInteger}%)`),
					bold("Actual Median Rent"),
				],
			});

			for (const [
				index,
				{ actualMedianRent, affordableMonthlyRent, name, rentToIncomeRatio },
			] of rankedCities.entries()) {
				cliTable.push([
					index + 1,
					name,
					`${rentToIncomeRatio.toFixed(1)}%`,
					`$${affordableMonthlyRent.toFixed(0)}`,
					`$${actualMedianRent.toFixed(0)}`,
				]);
			}

			console.log(cliTable.toString());
			break;
		}

		default:
			throw new Error(`Unsupported output type: ${outputType}`);
	}
}

const FileTypeMeta: Record<FileType, (rankedCities: RankedCities) => Promise<string>> = {
	[FileType.Ini]: async (rankedCities: RankedCities): Promise<string> => {
		return stringifyINI(rankedCities, {
			align: false,
			sort: false,
			whitespace: true,
		});
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
		default: false,
		message: "Write results to file system?",
	});
	if (!shouldWrite) return;

	const fileType = await select<FileType>({
		choices: [FileType.Json, FileType.JsonC, FileType.Json5, FileType.Yaml, FileType.Toml, FileType.Ini],
		default: FileType.Json,
		loop: true,
		message: "What format to write?",
	});

	const callback = FileTypeMeta[fileType];
	if (!callback) {
		console.error(`Unsupported file type: ${fileType}`);
		return;
	}

	const file = Bun.file(`./data/ranked-cities.${fileType}`);
	const fileContents = await callback(rankedCities);
	await file.write(fileContents);
}

async function rankCitiesByAffordabilityAsync(): Promise<void> {
	const url = buildCensusApiUrl();
	const { limit } = promptResultState.get();

	try {
		const parsedData = await fetchMsaDataAsync(url);
		const topMsas = parsedData.sort((a, b) => b.population - a.population).slice(0, limit);

		const rankedCities = calculateAffordability(topMsas);
		rankedCities.sort((a, b) => b.rentToIncomeRatio - a.rentToIncomeRatio);

		displayResults(rankedCities);
		await writeResultsAsync(rankedCities);
	} catch (error) {
		console.error("An unexpected error occurred:", error);
		process.exit(1);
	}
}

export async function mainAsync(): Promise<void> {
	await promptUserForOptionsAsync();
	const { limit } = promptResultState.get();
	console.log(`Fetching the ${limit} largest cities in the US...`);
	await rankCitiesByAffordabilityAsync();
}
if (import.meta.main) mainAsync().catch(console.error);
