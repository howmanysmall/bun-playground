#!/usr/bin/env bun

import LocationFilterMode from "meta/location-filter-mode";
import OutputType from "meta/output-type";
import { State } from "packages/fast-reactor";
import requireEnvironment from "utilities/require-environment";
import { z as zod } from "zod/v4";
import { fromError } from "zod-validation-error/v4";

/**
 * ## rank-cities-plus
 *
 * Welcome to my city ranking CLI. Created on 2025-06-25.
 *
 * ## Differences between this and `rank-cities.ts`
 *
 * ### New Feature
 * - Configurable income-to-rent threshold (still supported)
 * - Additional economic lenses (home price, cost-of-living, wage growth, unemployment)
 * - Benchmarking vs national average
 * - Optional five-year trend
 * - State / region filters
 * - User-defined metric weights & composite score
 *
 * External data sources:
 * - US Census (ACS) — median income / rent
 * - FRED — median home price (MSPUS) & wage growth (FRBATLWGT12MMUMHWGMSA)
 * - BEA — Regional Price Parities (cost-of-living proxy)
 * - BLS — Local Area Unemployment Statistics (unemployment & job growth)
 */
export const cli = {};

const CENSUS_API_KEY = requireEnvironment("CENSUS_API_KEY");
const FRED_API_KEY = requireEnvironment("FRED_API_KEY", true);
const BLS_API_KEY = requireEnvironment("BLS_API_KEY", true);
const BEA_API_KEY = requireEnvironment("BEA_API_KEY", true);

const isMsaData = zod
	.object({
		medianIncome: zod.number(),
		medianRent: zod.number(),
		name: zod.string(),
		population: zod.int(),
	})
	.readonly();
type MsaData = zod.infer<typeof isMsaData>;

export interface EnrichedMsaData extends MsaData {
	readonly benchmarkDelta?: number; // city ratio – national average
	readonly compositeScore?: number; // 0..100 (higher == less affordable)
	readonly costOfLivingIndex?: number;
	readonly fiveYearTrend?: number; // rent-burden Δ over 5 yrs
	readonly medianHomePrice?: number;
	readonly unemploymentPercent?: number;
	readonly wageGrowthPercent?: number;
}

interface RankingWeights {
	readonly costOfLiving: number; // 0.15
	readonly homeAfford: number; // 0.25
	readonly jobMarket: number; // 0.1
	readonly rentBurden: number; // default 0.4
	readonly wageGrowth: number; // 0.1
}
interface PromptResults {
	readonly filterMode: LocationFilterMode;
	readonly filterValue?: string; // e.g. "CA" or "West"
	readonly limit: number;
	readonly outputType: OutputType;
	readonly thresholdPercent: number;
	readonly useComposite: boolean;
	readonly verbose: boolean;
	readonly weights: RankingWeights;
}

const promptState = new State<PromptResults>({
	filterMode: LocationFilterMode.None,
	limit: 100,
	outputType: OutputType.CliTable3,
	thresholdPercent: 30,
	useComposite: true,
	verbose: false,
	weights: {
		costOfLiving: 0.15,
		homeAfford: 0.25,
		jobMarket: 0.1,
		rentBurden: 0.4,
		wageGrowth: 0.1,
	},
});

const CENSUS_YEAR = 2023;
const CENSUS_DATASET = "acs/acs5";

function getCensusMsaUrl(year: number): URL {
	const url = new URL(`https://api.census.gov/data/${year}/${CENSUS_DATASET}`);
	url.searchParams.set(
		"get",
		[
			"B25058_001E", // median rent
			"B19013_001E", // median income
			"NAME",
			"B01003_001E", // population
		].join(","),
	);
	url.searchParams.set("for", "metropolitan statistical area/micropolitan statistical area:*");
	url.searchParams.set("key", CENSUS_API_KEY);
	return url;
}

const isMsaDataArray = zod.array(zod.array(zod.string().nullable()));

async function fetchMsaDataAsync(year = CENSUS_YEAR): Promise<ReadonlyArray<MsaData>> {
	const response = await Bun.fetch(getCensusMsaUrl(year));
	if (!response.ok) {
		const error = new Error(`Failed to fetch ${year} MSA data - ${response.status} ${response.statusText}`);
		error.name = "FetchError";
		Error.captureStackTrace(error, fetchMsaDataAsync);
		throw error;
	}

	const json = await response.json();
	const result = await isMsaDataArray.safeParseAsync(json);
	if (!result.success) throw fromError(result.error);

	return result.data.slice(1).map((row): MsaData | undefined => {
		const [name, populationString, incomeString, rentString] = row;
		if (!name?.includes("Metro Area")) return;
	});
}
