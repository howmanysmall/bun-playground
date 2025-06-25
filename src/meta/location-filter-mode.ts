/**
 * Represents the available modes for filtering by location.
 *
 * @remarks
 * Used to control how location-based filtering is applied in the application.
 */
export enum LocationFilterMode {
	/** No location filtering is applied. */
	None = "none",

	/** Filter by region. */
	Region = "region",

	/** Filter by state. */
	State = "state",
}
export default LocationFilterMode;
