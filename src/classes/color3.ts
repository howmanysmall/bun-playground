function toTwoDigitHex(component: number): string {
	return component.toString(16).padStart(2, "0");
}

/**
 * The Color3 data type describes a color using red, green, and blue components
 * in the range of 0 to 1.
 */
export default class Color3 {
	/**
	 * Returns a new {@linkcode Color3} from a six- or three-character
	 * hexadecimal format, case insensitive. A preceding hashtag (`#`) is
	 * ignored, if present. This function interprets the given string as a
	 * typical web hex color in the format `RRGGBB` or `RGB` (shorthand for
	 * `RRGGBB`). For example, `#FFAA00` produces an orange color and is the
	 * same as `#FA0`.
	 *
	 * @param hex - The hexadecimal string.
	 * @returns A new {@linkcode Color3} instance representing the color.
	 * @constructs Color3
	 */
	public static fromHex(hex: string): Color3 {
		const cleanedHex = hex.replace(/^#/, "");
		let expandedHex: string;
		if (cleanedHex.length === 3)
			expandedHex =
				cleanedHex.charAt(0) +
				cleanedHex.charAt(0) +
				cleanedHex.charAt(1) +
				cleanedHex.charAt(1) +
				cleanedHex.charAt(2) +
				cleanedHex.charAt(2);
		else if (cleanedHex.length === 6) expandedHex = cleanedHex;
		else throw new Error(`Invalid hex color: "${hex}"`);

		const redValue = Number.parseInt(expandedHex.slice(0, 2), 16);
		const greenValue = Number.parseInt(expandedHex.slice(2, 4), 16);
		const blueValue = Number.parseInt(expandedHex.slice(4, 6), 16);
		return new Color3(redValue / 255, greenValue / 255, blueValue / 255);
	}

	/**
	 * Creates a {@linkcode Color3} with the given hue, saturation, and value.
	 * The parameters should be within the range of 0 to 1.
	 *
	 * @param hue - The hue of the color, in the range [0, 1].
	 * @param saturation - The saturation of the color, in the range [0, 1].
	 * @param value - The value (brightness) of the color, in the range [0, 1].
	 * @returns A new {@linkcode Color3} instance representing the color.
	 * @constructs Color3
	 */
	// eslint-disable-next-line max-lines-per-function -- what else can i do
	public static fromHSV(hue: number, saturation: number, value: number): Color3 {
		const chroma = value * saturation;
		const hueSegment = hue * 6;
		const intermediate = chroma * (1 - Math.abs((hueSegment % 2) - 1));

		let red: number;
		let green: number;
		let blue: number;

		if (hueSegment >= 0 && hueSegment < 1) {
			red = chroma;
			green = intermediate;
			blue = 0;
		} else if (hueSegment < 2) {
			red = intermediate;
			green = chroma;
			blue = 0;
		} else if (hueSegment < 3) {
			red = 0;
			green = chroma;
			blue = intermediate;
		} else if (hueSegment < 4) {
			red = 0;
			green = intermediate;
			blue = chroma;
		} else if (hueSegment < 5) {
			red = intermediate;
			green = 0;
			blue = chroma;
		} else {
			red = chroma;
			green = 0;
			blue = intermediate;
		}

		const matchValue = value - chroma;
		return new Color3(red + matchValue, green + matchValue, blue + matchValue);
	}

	/**
	 * Creates a {@linkcode Color3} with the given red, green, and blue
	 * components. Unlike most other {@linkcode Color3} functions, the parameters
	 * for this function should be within the range of 0 to 255.
	 *
	 * @param red - The red component of the color, in the range [0, 255].
	 * @param green - The green component of the color, in the range [0, 255].
	 * @param blue - The blue component of the color, in the range [0, 255].
	 * @returns A new {@linkcode Color3} instance representing the color.
	 * @constructs Color3
	 */
	public static fromRGB(red = 0, green = 0, blue = 0): Color3 {
		return new Color3(red / 255, green / 255, blue / 255);
	}

	/** The blue value of the color. */
	// eslint-disable-next-line id-length -- polyfill
	public readonly B: number;

	/** The green value of the color. */
	// eslint-disable-next-line id-length -- polyfill
	public readonly G: number;

	/** The red value of the color. */
	// eslint-disable-next-line id-length -- polyfill
	public readonly R: number;

	/**
	 * Returns a {@linkcode Color3} interpolated between two colors. The alpha
	 * value should be within the range of 0 to 1.
	 *
	 * @param other - The other color to interpolate with.
	 * @param alpha - The interpolation factor.
	 * @returns A new {@linkcode Color3} instance representing the interpolated
	 *   color.
	 */
	public Lerp(other: Color3, alpha: number): Color3 {
		return new Color3(
			this.R + (other.R - this.R) * alpha,
			this.G + (other.G - this.G) * alpha,
			this.B + (other.B - this.B) * alpha,
		);
	}

	/**
	 * Converts the color to a six-character hexadecimal string representing the
	 * color in the format `RRGGBB`. It is not prefixed with an octothorpe
	 * (`#`).
	 *
	 * The returned string can be provided to {@linkcode Color3.fromHex} to
	 * produce the original color.
	 *
	 * @example
	 *
	 * ```ts
	 * const red = Color3.fromRGB(255, 0, 0);
	 * const magenta = Color3.fromRGB(236, 0, 140);
	 *
	 * console.log(red.ToHex()); // "ff0000"
	 * console.log(magenta.ToHex()); // "ec008c"
	 * ```
	 *
	 * @returns A string representing the color in hexadecimal format.
	 */
	public ToHex(): string {
		const redInt = Math.round(this.R * 255);
		const greenInt = Math.round(this.G * 255);
		const blueInt = Math.round(this.B * 255);
		return toTwoDigitHex(redInt) + toTwoDigitHex(greenInt) + toTwoDigitHex(blueInt);
	}

	/**
	 * Returns the hue, saturation, and value of a {@linkcode Color3}. This
	 * function is the inverse operation of the {@linkcode Color3.fromHSV}
	 * constructor.
	 *
	 * @example
	 *
	 * ```ts
	 * const red = Color3.fromRGB(255, 0, 0);
	 * const green = Color3.fromRGB(0, 255, 0);
	 *
	 * const [redH, redS, redV] = red.ToHSV();
	 * console.log(redH, redS, redV); // 1 1 1
	 *
	 * const [greenH, greenS, greenV] = green.ToHSV();
	 * console.log(greenH, greenS, greenV); // 0.3333333 1 1
	 * ```
	 *
	 * @returns A tuple containing the hue, saturation, and value of the color,
	 *   in the range [0, 1].
	 */
	public ToHSV(): [hue: number, saturation: number, value: number] {
		const maximum = Math.max(this.R, this.G, this.B);
		const minimum = Math.min(this.R, this.G, this.B);
		const delta = maximum - minimum;
		let hueDegrees: number;

		if (delta === 0) hueDegrees = 0;
		else if (maximum === this.R) hueDegrees = ((this.G - this.B) / delta) % 6;
		else if (maximum === this.G) hueDegrees = (this.B - this.R) / delta + 2;
		else hueDegrees = (this.R - this.G) / delta + 4;

		hueDegrees *= 60;
		if (hueDegrees < 0) hueDegrees += 360;

		let hueNormalized = hueDegrees / 360;
		if (hueNormalized === 0) hueNormalized = 1;

		const saturation = maximum === 0 ? 0 : delta / maximum;
		const value = maximum;
		return [hueNormalized, saturation, value];
	}

	/**
	 * Returns a {@linkcode Color3} with the given red, green, and blue values.
	 *
	 * @param red - The red component of the color, in the range [0, 1].
	 * @param green - The green component of the color, in the range [0, 1].
	 * @param blue - The blue component of the color, in the range [0, 1].
	 * @constructs Color3
	 */
	public constructor(red = 0, green = 0, blue = 0) {
		this.R = red;
		this.G = green;
		this.B = blue;
	}
}
