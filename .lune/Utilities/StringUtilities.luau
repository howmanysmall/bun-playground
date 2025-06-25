--!optimize 2
--!strict

local GreenTea = require("@packages/GreenTea")
local GreenTeaAssert = require("@utilities/GreenTeaAssert")
local TypeError = require("@errors/TypeError")

local StringUtilities = {}

local IsNumberRaw = GreenTea.number({})
local IsStringRaw = GreenTea.string({})
local IsNumberOrStringRaw = GreenTea.union(IsNumberRaw, IsStringRaw)

local IsValidCharacters = GreenTea.build(GreenTea.optional(GreenTea.union(IsStringRaw, GreenTea.array(IsStringRaw))))
local IsMaybeNumber = GreenTea.build(GreenTea.optional(IsNumberRaw))
local IsMaybeNumberOrString = GreenTea.build(GreenTea.optional(IsNumberOrStringRaw))
local IsPositiveInteger = GreenTea.build(GreenTea.number({integer = true, range = "(0, inf]"}))
local IsString = GreenTea.build(IsStringRaw)

local function ToPascalCase(value: string): string
	GreenTeaAssert(IsString, value, ToPascalCase, TypeError)

	return (
		string.gsub(
			(string.gsub((string.gsub(string.lower(value), "[ _-](%a)", string.upper)), "^%a", string.upper)),
			"%p",
			""
		)
	)
end
StringUtilities.ToPascalCase = ToPascalCase

local function GetNumberFromString(value: nil | number | string, defaultValue: number?): number
	GreenTeaAssert(IsMaybeNumberOrString, value, GetNumberFromString, TypeError)
	GreenTeaAssert(IsMaybeNumber, defaultValue, GetNumberFromString, TypeError)

	local trueDefaultValue: number = if defaultValue then defaultValue else 0

	if value == nil or type(value) ~= "string" then
		return if value ~= nil and type(value) == "number" then value else trueDefaultValue
	end

	local number = tonumber(value)
	if number then
		return number
	end

	local match = (string.match(value, "%-?%d+%.?%d*"))
	return if match then tonumber(match) or trueDefaultValue else trueDefaultValue
end
StringUtilities.GetNumberFromString = GetNumberFromString

local CHARACTERS =
	string.split("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz~`!@#$%^&*()-_=+[{]}\\|;:'\",<.>/?", "")

local function GetRandomString(size: number, characters: {string} | nil | string): string
	GreenTeaAssert(IsPositiveInteger, size, GetRandomString, TypeError)
	GreenTeaAssert(IsValidCharacters, characters, GetRandomString, TypeError)

	local stringBuilder = table.create(size)

	if characters then
		local array = if type(characters) == "string" then string.split(characters, "") else characters
		local length = #array

		for index = 1, size do
			stringBuilder[index] = array[math.random(length)]
		end
	else
		for index = 1, size do
			stringBuilder[index] = CHARACTERS[math.random(94)]
		end
	end

	return table.concat(stringBuilder)
end
StringUtilities.GetRandomString = GetRandomString

local function GetRandomStringConcat(size: number, characters: {string} | nil | string): string
	GreenTeaAssert(IsPositiveInteger, size, GetRandomStringConcat, TypeError)
	GreenTeaAssert(IsValidCharacters, characters, GetRandomStringConcat, TypeError)

	local randomString = ""

	if characters then
		local array = if type(characters) == "string" then string.split(characters, "") else characters
		local length = #array

		for _ = 1, size do
			randomString ..= array[math.random(length)]
		end
	else
		for _ = 1, size do
			randomString ..= CHARACTERS[math.random(94)]
		end
	end

	return randomString
end
StringUtilities.GetRandomStringConcat = GetRandomStringConcat

local function ToKebabCase(value: string): string
	GreenTeaAssert(IsString, value, ToKebabCase, TypeError)

	return string.lower(
		(
			string.gsub(
				(
					string.gsub(
						(
							string.gsub(
								(string.gsub((string.gsub(value, "(%w)(%u)", "%1-%2")), "[^%w]+", "-")),
								"%-+",
								"-"
							)
						),
						"^%-",
						""
					)
				),
				"%-$",
				""
			)
		)
	)
end
StringUtilities.ToKebabCase = ToKebabCase

local function ToKebabCaseSafe(value: string): string
	GreenTeaAssert(IsString, value, ToKebabCaseSafe, TypeError)

	local mutatedValue = (
		string.gsub(
			(
				string.gsub(
					(
						string.gsub(
							(
								string.gsub(
									(
										string.gsub(
											(string.gsub(value, "([a-z])([A-Z])", "%1 %2")),
											"([A-Z]+)([A-Z][a-z])",
											"%1 %2"
										)
									),
									"[^%w]+",
									" "
								)
							),
							"%s+",
							" "
						)
					),
					"^%s+",
					""
				)
			),
			"%s+$",
			""
		)
	)

	return table.concat(string.split(string.lower(mutatedValue), " "), "-")
end
StringUtilities.ToKebabCaseSafe = ToKebabCaseSafe

local function TrimAnsi(value: string): string
	GreenTeaAssert(IsString, value, TrimAnsi, TypeError)
	return (string.gsub(value, "\27%[[%d;?]*[A-Za-z]", ""))
end
StringUtilities.TrimAnsi = TrimAnsi

return table.freeze(StringUtilities)
