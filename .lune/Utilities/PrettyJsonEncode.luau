--!optimize 2
--!strict

local LuauPolyfill = require("@packages/LuauPolyfill")
local Array = LuauPolyfill.Array

local function FormatByte(character: string): string
	return string.format("\\u%04x", (string.byte(character, 1, 1)))
end
local function EscapeString(value: string): string
	return (string.gsub(value, "[%c\\\"]", FormatByte))
end

local function GetSignificantDigits(number: number): string
	local asString = tostring(number)
	if tonumber(asString) == number then
		return asString
	end

	for index = 15, 99 do
		asString = string.format(`%.{index}g`, number)
		if tonumber(asString) == number then
			return asString
		end
	end

	error(`Couldn't reproduce accurate number for {number}.`)
end

export type Options = {
	Indent: string?,
	IndentLevel: number?,
	ShouldUseSortFunction: nil | (object: {[any]: unknown}) -> boolean,
	SortKeys: nil | (a: unknown, b: unknown) -> boolean,
	[any]: never,
}

local function PrettyJsonEncode(object: unknown, options: Options?): string
	local trueOptions: Options = options or {}
	local indent = trueOptions.Indent or "\t"
	local indentLevel = trueOptions.IndentLevel or 0

	local padding = string.rep(indent, indentLevel)
	local padded = `{padding}{indent}`

	local typeOf = type(object)
	if typeOf == "table" then
		local shouldUseSortFunction = trueOptions.ShouldUseSortFunction
		local sortKeys = trueOptions.SortKeys
		local nextOptions: Options = {
			Indent = indent;
			IndentLevel = indentLevel + 1;
			ShouldUseSortFunction = shouldUseSortFunction;
			SortKeys = sortKeys;
		}

		if Array.isArray(object) then
			local cast = object :: {unknown}
			local length = #cast
			if length == 0 then
				return "[]"
			end

			local stringBuilder = table.create(length)
			for index, value in cast do
				stringBuilder[index] = PrettyJsonEncode(value, nextOptions)
			end

			return `[\n{padded}{table.concat(stringBuilder, `,\n{padded}`)}\n{padding}]`
		end

		local cast = object :: {[any]: unknown}
		if next(cast) == nil then
			return "{}"
		end

		local keys = table.create(table.maxn(cast))
		local length = 0
		for key in cast do
			length += 1
			keys[length] = key
		end

		if shouldUseSortFunction and shouldUseSortFunction(cast) then
			table.sort(keys, sortKeys)
		else
			table.sort(keys)
		end

		local stringBuilder = table.create(length)
		for index, key in keys do
			local value = cast[key]
			stringBuilder[index] = `{padded}"{EscapeString(key)}": {PrettyJsonEncode(value, nextOptions)}`
		end

		return `\{\n{table.concat(stringBuilder, ",\n")}\n{padding}}`
	end

	if typeOf == "string" then
		return `"{EscapeString(object :: string)}"`
	end

	if typeOf == "number" then
		return GetSignificantDigits(object :: number)
	end

	if typeOf == "boolean" then
		return tostring(object)
	end

	return "null"
end

return PrettyJsonEncode
