#!/usr/bin/env bun

import { confirm, number } from "@inquirer/prompts";
import { z as zod } from "zod/v4";
import { fromError } from "zod-validation-error";

const CENSUS_API_KEY = Bun.env.CENSUS_API_KEY;
if (!CENSUS_API_KEY) {
	console.error("⚠️  Please set CENSUS_API_KEY in your .env");
	process.exit(1);
}

const limit = await number({
	default: 100,
	message: "How many cities to fetch?",
	min: 1,
	required: true,
	step: 1,
});
const verbose = await confirm({
	default: false,
	message: "Verbose output?",
});

if (verbose) console.log(`Fetching the ${limit} largest cities in the US...`);

const YEAR = 2023;
const HUD_CSV = "https://www.huduser.gov/portal/datasets/FMR/FMR_All_1983_2025.csv";

const isPlaceRow = zod.tuple([zod.string(), zod.string(), zod.string(), zod.string()]);
const isPlaceRows = zod.array(isPlaceRow);
type PlaceRow = [name: string, population: string, state: string, place: string];

async function fetchLargestCitiesAsync(): Promise<ReadonlyArray<PlaceRow>> {
	const response = await fetch(
		`https://api.census.gov/data/${YEAR}/acs/acs1` +
			"?get=NAME,B01003_001E" +
			"&for=metropolitan%20statistical%20area/micropolitan%20statistical%20area:*" +
			`&key=${CENSUS_API_KEY}`,
	);

	if (!response.ok) {
		const error = new Error(`Census API error ${response.status}: ${response.statusText}`);
		Error.captureStackTrace(error, fetchLargestCitiesAsync);
		throw error;
	}

	const raw = await response.json();
	if (verbose) console.table(raw);

	const result = await isPlaceRows.safeParseAsync(raw);
	if (!result.success) throw fromError(result.error);

	return result.data
		.slice(1)
		.sort((a, b) => Number(a[1]) - Number(b[1]))
		.slice(0, limit);
}

const yeahSure = await fetchLargestCitiesAsync();
// console.log(
// 	`Fetched ${yeahSure.length} cities. - ${Bun.inspect(yeahSure, {
// 		colors: true,
// 		compact: false,
// 		sorted: false,
// 	})}`,
// );

// // const isAcsCensusArray = zod.array(zod.tuple([zod.string(), zod.string(), zod.string()]));
// const isCensusRow = zod.tuple([zod.string(), zod.string(), zod.string()]);
// const CensusResponse = zod.tuple([zod.array(zod.string()), isCensusRow]);

// async function fetchMedianEarningsAsync(state: string, place: string): Promise<number> {
// 	const res = await fetch(url);
// 	if (!res.ok) {
// 		throw new Error(`Census API error ${res.status}: ${res.statusText}`);
// 	}

// 	const rawJson = await fetch(
// 		`https://api.census.gov/data/${YEAR}/acs/acs5?get=B20017_001E&for=place:${place}&in=state:${state}&key=${CENSUS_API_KEY}`,
// 	).then(getJsonAsync);
// 	const result = await isAcsCensusArray.safeParseAsync(rawJson);
// 	if (!result.success) {
// 		const error = fromError(result.error);
// 		console.error(`Failed to parse median earnings for ${state}-${place}:`, error.toString());
// 		process.exit(1);
// 	}

// 	const [[, value]] = result.data.slice(1);
// }
