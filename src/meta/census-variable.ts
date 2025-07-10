/**
 * Enumeration of selected Census API variable codes for use with the American
 * Community Survey (ACS) and Decennial Census datasets. Each value corresponds
 * to a specific data field as defined by the U.S. Census Bureau.
 *
 * @see https://api.census.gov/data.html for variable definitions and dataset documentation.
 */
export enum CensusVariable {
	/** Median age of the population (ACS Table B01002, field 001E). */
	MedianAge = "B01002_001E",

	/**
	 * Median value (in dollars) of owner-occupied housing units (ACS Table
	 * B25077, field 001E).
	 */
	MedianHomeValue = "B25077_001E",

	/**
	 * Median household income in the past 12 months (in inflation-adjusted
	 * dollars) (ACS Table B19013, field 001E).
	 */
	MedianIncome = "B19013_001E",

	/**
	 * Median gross rent (in dollars) for renter-occupied housing units (ACS
	 * Table B25058, field 001E).
	 */
	MedianRent = "B25058_001E",

	/** Name of the geographic area (e.g., state, county, tract). */
	Name = "NAME",

	/**
	 * Population of Asian alone, not Hispanic or Latino (ACS Table B03002,
	 * field 006E).
	 */
	RaceAsianNonHispanic = "B03002_006E",

	/**
	 * Population of Black or African American alone, not Hispanic or Latino
	 * (ACS Table B03002, field 004E).
	 */
	RaceBlackNonHispanic = "B03002_004E",

	/**
	 * Population of Native Hawaiian and Other Pacific Islander alone, not
	 * Hispanic or Latino (ACS Table B03002, field 007E).
	 */
	RaceHawaiianPacificIslanderNonHispanic = "B03002_007E",

	/**
	 * Population of Hispanic or Latino (of any race) (ACS Table B03002, field
	 * 012E).
	 */
	RaceHispanic = "B03002_012E",

	/**
	 * Population of American Indian and Alaska Native alone, not Hispanic or
	 * Latino (ACS Table B03002, field 005E).
	 */
	RaceNativeAmericanNonHispanic = "B03002_005E",

	/**
	 * Population of Some Other Race alone, not Hispanic or Latino (ACS Table
	 * B03002, field 008E).
	 */
	RaceOtherNonHispanic = "B03002_008E",

	/**
	 * Population of Two or More Races, not Hispanic or Latino (ACS Table
	 * B03002, field 009E).
	 */
	RaceTwoOrMoreNonHispanic = "B03002_009E",

	/**
	 * Population of White alone, not Hispanic or Latino (ACS Table B03002,
	 * field 003E).
	 */
	RaceWhiteNonHispanic = "B03002_003E",

	/** Total population (ACS Table B01003, field 001E). */
	TotalPopulation = "B01003_001E",
}
export default CensusVariable;
