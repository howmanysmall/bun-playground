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
		medianHomeValue: zod.number(),
		medianIncome: zod.number(),
		medianRent: zod.number(),
		name: zod.string(),
		population: zod.int(),
	})
	.readonly();
type MsaData = zod.infer<typeof isMsaData>;

interface AffordabilityRank {
	readonly medianHomeValue: number;
	readonly actualMedianRent: number;
	readonly affordableMonthlyRent: number;
	/** Median home value relative to annual income (%) */
	readonly homeValueToIncomeRatio: number;
	readonly medianMonthlyIncome: number;
	readonly name: string;
	rank: number;
	/** Percentage of income spent on rent */
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

	promptResultState.set({
		affordableHousingPercentageInteger,
		limit,
		outputType,
	});
}

const CENSUS_API_YEAR = 2023;
const CENSUS_DATA_SOURCE = "acs/acs5";

const VARIABLES = {
	MEDIAN_GROSS_RENT: "B25058_001E",
	MEDIAN_HOME_VALUE: "B25077_001E",
	MEDIAN_HOUSEHOLD_INCOME: "B19013_001E",
	NAME: "NAME", // Median rent for renter-occupied housing units
	TOTAL_POPULATION: "B01003_001E",
};

function buildCensusApiUrl(): URL {
	const url = new URL(`https://api.census.gov/data/${CENSUS_API_YEAR}/${CENSUS_DATA_SOURCE}`);
	url.searchParams.set(
		"get",
		[
			VARIABLES.NAME,
			VARIABLES.TOTAL_POPULATION,
			VARIABLES.MEDIAN_HOUSEHOLD_INCOME,
			VARIABLES.MEDIAN_GROSS_RENT,
			VARIABLES.MEDIAN_HOME_VALUE,
		].join(","),
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
		const error = new Error(`Census API request failed with status ${response.status} - ${text}`);
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
			const [name, populationString, incomeString, rentString, homeString] = row;
			if (!name?.includes("Metro Area") || !populationString || !incomeString || !rentString || !homeString)
				return undefined;

			const population = Number.parseInt(populationString, 10);
			const medianIncome = Number.parseInt(incomeString, 10);
			const medianRent = Number.parseInt(rentString, 10);
			const medianHomeValue = Number.parseInt(homeString, 10);
			if (population <= 0 || medianIncome <= 0 || medianRent <= 0 || medianHomeValue <= 0) return undefined;

			return {
				medianHomeValue,
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

	return metroStatisticalAreas.map(({ medianHomeValue, medianIncome, medianRent, name }): AffordabilityRank => {
		const medianMonthlyIncome = medianIncome / 12;
		const affordableMonthlyRent = medianMonthlyIncome * affordableHousingPercentage;

		const rentToIncomeRatio = (medianRent / affordableMonthlyRent) * 100;
		const homeValueToIncomeRatio = (medianHomeValue / medianIncome) * 100;

		return {
			actualMedianRent: medianRent,
			affordableMonthlyRent,
			homeValueToIncomeRatio,
			medianHomeValue,
			medianMonthlyIncome,
			name,
			rank: 0,
			rentToIncomeRatio,
		};
	});
}

// biome-ignore lint/suspicious/noConstEnum: not built
const enum DataSetKey {
	ActualMedianRent = "Actual Median Rent",
	AffordableRent = "Affordable Rent",
	CityMarket = "City Market",
	HomeValueToIncome = "Home-Value-to-Income (%)",
	MedianHomeValue = "Median Home Value",
	Rank = "Rank",
	RentBurden = "Rent Burden (%)",
}

type RankedCities = Array<Omit<AffordabilityRank, "rank">>;
type RankedCity = Readonly<Record<DataSetKey, string>>;

const keys: ReadonlyArray<DataSetKey> = [
	DataSetKey.Rank,
	DataSetKey.CityMarket,
	DataSetKey.RentBurden,
	DataSetKey.AffordableRent,
	DataSetKey.ActualMedianRent,
	DataSetKey.MedianHomeValue,
	DataSetKey.HomeValueToIncome,
];

function displayResults(rankedCities: RankedCities): void {
	const { affordableHousingPercentageInteger, outputType } = promptResultState.get();

	console.log(
		`\n--- Top ${rankedCities.length} US Cities by Rent & Home Affordability (Threshold: ${affordableHousingPercentageInteger}%) ---\n`,
	);

	switch (outputType) {
		case OutputType.ConsoleTable:
			console.table(
				rankedCities.map(
					(
						{
							medianHomeValue,
							actualMedianRent,
							affordableMonthlyRent,
							homeValueToIncomeRatio,
							name,
							rentToIncomeRatio,
						},
						index,
					): RankedCity => ({
						[DataSetKey.ActualMedianRent]: `$${actualMedianRent.toFixed(0)}`,
						[DataSetKey.AffordableRent]: `$${affordableMonthlyRent.toFixed(0)}`,
						[DataSetKey.CityMarket]: name,
						[DataSetKey.HomeValueToIncome]: `${homeValueToIncomeRatio.toFixed(1)}%`,
						[DataSetKey.MedianHomeValue]: `$${medianHomeValue.toFixed(0)}`,
						[DataSetKey.Rank]: `${index + 1}`,
						[DataSetKey.RentBurden]: `${rentToIncomeRatio.toFixed(1)}%`,
					}),
				),
				keys,
			);
			break;

		case OutputType.CliTable3: {
			const bold = chalk.bold;
			const cliTable = new CliTable3({
				head: [
					bold(DataSetKey.Rank),
					bold(DataSetKey.CityMarket),
					bold(DataSetKey.RentBurden),
					bold(`${DataSetKey.AffordableRent} (${affordableHousingPercentageInteger}%)`),
					bold(DataSetKey.ActualMedianRent),
					bold(DataSetKey.MedianHomeValue),
					bold(DataSetKey.HomeValueToIncome),
				],
			});

			for (const [
				index,
				{
					actualMedianRent,
					affordableMonthlyRent,
					homeValueToIncomeRatio,
					medianHomeValue,
					name,
					rentToIncomeRatio,
				},
			] of rankedCities.entries()) {
				cliTable.push([
					index + 1,
					name,
					`${rentToIncomeRatio.toFixed(1)}%`,
					`$${affordableMonthlyRent.toFixed(0)}`,
					`$${actualMedianRent.toFixed(0)}`,
					`$${medianHomeValue.toFixed(0)}`,
					`${homeValueToIncomeRatio.toFixed(1)}%`,
				]);
			}

			console.log(cliTable.toString());
			break;
		}

		default:
			throw new Error(`Unsupported output type: ${outputType}`);
	}
}

const FileTypeMeta: Record<FileType, (rankedCities: RankedCities) => string> = {
	[FileType.Ini]: (rankedCities: RankedCities): string =>
		stringifyINI(rankedCities, { align: false, sort: false, whitespace: true }),
	[FileType.Json]: (rankedCities: RankedCities): string =>
		stringifyJSON(rankedCities, { indent: 4, preserveIndentation: true, preserveWhitespace: true }),
	[FileType.Json5]: (rankedCities: RankedCities): string =>
		stringifyJSON5(rankedCities, {
			indent: 4,
			preserveIndentation: true,
			preserveWhitespace: true,
			quote: '"',
		}),
	[FileType.JsonC]: (rankedCities: RankedCities): string =>
		stringifyJSONC(rankedCities, {
			indent: 4,
			preserveIndentation: true,
			preserveWhitespace: true,
		}),
	[FileType.Toml]: stringifyTOML,
	[FileType.Yaml]: (rankedCities: RankedCities): string =>
		stringifyYAML(rankedCities, { indent: 4, preserveIndentation: true, preserveWhitespace: true }),
};

async function writeResultsAsync(rankedCities: RankedCities): Promise<void> {
	const shouldWrite = await confirm({ default: false, message: "Write results to file system?" });
	if (!shouldWrite) return;

	const fileType = await select<FileType>({
		choices: Object.values(FileType),
		default: FileType.Json,
		loop: true,
		message: "What format to write?",
	});

	const callback = FileTypeMeta[fileType];
	if (callback) await Bun.file(`./data/ranked-cities.${fileType}`).write(callback(rankedCities));
	else console.error(`Unsupported file type: ${fileType}`);
}

async function rankCitiesByAffordabilityAsync(): Promise<void> {
	const url = buildCensusApiUrl();
	const { limit } = promptResultState.get();

	try {
		const parsedData = await fetchMsaDataAsync(url);
		const top = parsedData.sort((a, b) => b.population - a.population).slice(0, limit);
		const ranked = calculateAffordability(top).sort((a, b) => b.rentToIncomeRatio - a.rentToIncomeRatio);
		for (const [index, city] of ranked.entries()) city.rank = index + 1;
		displayResults(ranked);
		await writeResultsAsync(ranked);
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
