/**
 * Enumeration of the four main U.S. Census Bureau regions. These regions are
 * used for statistical and reporting purposes.
 *
 * @see https://www2.census.gov/geo/pdfs/maps-data/maps/reference/us_regdiv.pdf
 */
export enum UsaRegion {
	/** Midwest region (includes states like Illinois, Ohio, Michigan, etc.). */
	Midwest = "Midwest",
	/**
	 * Northeast region (includes states like New York, Pennsylvania,
	 * Massachusetts, etc.).
	 */
	Northeast = "Northeast",
	/** South region (includes states like Texas, Florida, Georgia, etc.). */
	South = "South",
	/**
	 * West region (includes states like California, Washington, Colorado,
	 * etc.).
	 */
	West = "West",
}
export default UsaRegion;
