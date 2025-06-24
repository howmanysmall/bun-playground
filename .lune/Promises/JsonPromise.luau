--!optimize 2
--!strict

local GreenTea = require("@packages/GreenTea")
local GreenTeaAssert = require("@utilities/GreenTeaAssert")
local LRUCache = require("@classes/LRUCache")
local PrettyJsonEncode = require("@utilities/PrettyJsonEncode")
local Promise = require("@packages/Promise")
local TypeError = require("@errors/TypeError")
local serde = require("@lune/serde")

--[=[
	Utility library related to JSON.
	@class JsonPromise
]=]
local JsonPromise = {}
export type Promise<T...> = Promise.TypedPromise<T...>

local FormatType = table.freeze({
	Compact = "Compact" :: "Compact";
	Pretty = "Pretty" :: "Pretty";
	ProperPretty = "ProperPretty" :: "ProperPretty";
})
JsonPromise.FormatType = FormatType

--[=[
	The JSON formatting type. `ProperPretty` is a pretty format, but it uses a
	more complex algorithm to ensure that the output is as human-readable as
	possible (sorts keys).

	@type FormatType "Compact" | "Pretty" | "ProperPretty"
	@within JsonPromise
]=]
export type FormatType = "Compact" | "Pretty" | "ProperPretty"

local IsFormatTypeRaw = GreenTea.union(
	GreenTea.literal(FormatType.Compact),
	GreenTea.literal(FormatType.Pretty),
	GreenTea.literal(FormatType.ProperPretty)
)

local IsMaybeFormatType = GreenTea.build(GreenTea.optional(IsFormatTypeRaw))
local IsString = GreenTea.build(GreenTea.string())
local IsValidData = GreenTea.build(GreenTea.unknown({allowNil = true}))

--[=[
	Returns a Promise that encodes data to JSON.

	@param data unknown -- The data to encode.
	@param formatType? FormatType -- The format type to use for encoding.
	@return Promise<string>
]=]
function JsonPromise.EncodeAsync(data: unknown, formatType: FormatType?): Promise<string>
	if _G.__DEV__ then
		GreenTeaAssert(IsValidData, data, JsonPromise.EncodeAsync, TypeError)
		GreenTeaAssert(IsMaybeFormatType, formatType, JsonPromise.EncodeAsync, TypeError)
	end

	local trueFormatType: FormatType = formatType or FormatType.Compact

	return Promise.new(function(resolve, reject): ()
		if trueFormatType == FormatType.Compact then
			local success, value = pcall(serde.encode, "json" :: "json", data)
			if success then
				resolve(value)
			else
				reject(value)
			end
		elseif trueFormatType == FormatType.Pretty then
			local success, value = pcall(serde.encode, "json" :: "json", data, true)
			if success then
				resolve(value)
			else
				reject(value)
			end
		elseif trueFormatType == FormatType.ProperPretty then
			local success, value = pcall(PrettyJsonEncode, data)
			if success then
				resolve(value)
			else
				reject(value)
			end
		else
			reject(`Invalid format type: {trueFormatType}`)
		end
	end)
end

--[=[
	Returns a Promise that decodes a JSON string.
	@param jsonString string -- The JSON string to decode.
	@return Promise<T>
]=]
function JsonPromise.DecodeUntypedAsync<T>(jsonString: string): Promise<T>
	return Promise.new(function(resolve, reject)
		local success, value = pcall(serde.decode, "json" :: "json", jsonString)
		if success then
			resolve(value)
		else
			reject(value)
		end
	end)
end

function JsonPromise.DecodeAsync<T>(input: string, greenTeaType: T): Promise<T>
	local typeChecker = GreenTea.build(greenTeaType)
	GreenTeaAssert(IsString, input, JsonPromise.DecodeAsync, TypeError)

	return Promise.new(function(resolve, reject)
		local success, valueOrError = pcall(serde.decode, "json" :: "json", input)
		if success then
			local typeSuccess, typeError = typeChecker:matches(valueOrError)
			if typeSuccess then
				resolve(valueOrError)
			else
				reject(typeError)
			end
		else
			reject(valueOrError)
		end
	end)
end

local typeCache: LRUCache.LRUCache<unknown, typeof(GreenTea.build(GreenTea.any()))> = LRUCache.new(20)
local getCached = typeCache.Get
local setCached = typeCache.Set

function JsonPromise.DecodeCachedAsync<T>(input: string, greenTeaType: T): Promise<T>
	local fromCache = getCached(typeCache, greenTeaType) :: typeof(GreenTea.build(greenTeaType))
	if not fromCache then
		fromCache = GreenTea.build(greenTeaType)
		setCached(typeCache, greenTeaType, fromCache :: never)
	end

	GreenTeaAssert(IsString, input, JsonPromise.DecodeCachedAsync, TypeError)

	return Promise.new(function(resolve, reject)
		local success, valueOrError = pcall(serde.decode, "json" :: "json", input)
		if success then
			local typeSuccess, typeError = fromCache:matches(valueOrError)
			if typeSuccess then
				resolve(valueOrError)
			else
				reject(typeError)
			end
		else
			reject(valueOrError)
		end
	end)
end

return table.freeze(JsonPromise)
