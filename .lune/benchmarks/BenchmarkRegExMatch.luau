--!optimize 2
--!strict

local PathFileSystem = require("@packages/PathFileSystem")
local PromptFor = require("@utilities/PromptFor")
local RegEx = require("@lune/regex")
local SpeedTester = require("@utilities/SpeedTester")
local _Debug = require("@packages/Debug")

local Benchmark = {}
Benchmark.AmountToTestWith = 500
Benchmark.BarGraphMultiplier = 70
Benchmark.TimeThreshold = 1

Benchmark.Configure = PromptFor

local IGNORE_ALL_COMMENT = RegEx.new("^(\\/\\*\\*\\s*biome-ignore-all)")
local IGNORE_NEXT_COMMENT = RegEx.new("^(\\/\\/\\s*biome-ignore)")
local IGNORE_COMBINED_COMMENT = RegEx.new("^((\\/\\/\\s*biome-ignore)|(\\/\\*\\*\\s*biome-ignore-all))")
local IGNORE_COMBINED_COMMENT_V2 = RegEx.new("^(\\/\\/\\s*biome-ignore|\\/\\*\\*\\s*biome-ignore-all)")

local IGNORE_COMBINED_COMMENT_NO_START = RegEx.new("(\\/\\/\\s*biome-ignore|\\/\\*\\*\\s*biome-ignore-all)")

local IsMatch = IGNORE_ALL_COMMENT.isMatch

local function MatchBiomeComment(line: string): boolean
	return IGNORE_ALL_COMMENT:isMatch(line) or IGNORE_NEXT_COMMENT:isMatch(line)
end
local function MatchBiomeCommentCached(line: string): boolean
	return IsMatch(IGNORE_ALL_COMMENT, line) or IsMatch(IGNORE_NEXT_COMMENT, line)
end

function Benchmark.Run(): number
	local descendants = PathFileSystem.GetDescendants(PathFileSystem.CWD:join("src"))
	local sources = table.create(#descendants // 4)
	local length = 0

	for _, descendant in descendants do
		if not PathFileSystem.IsFile(descendant) then
			continue
		end

		local fileExtension = descendant:extension()
		if not fileExtension or (fileExtension ~= "ts" and fileExtension ~= "tsx") then
			continue
		end

		length += 1
		sources[length] = PathFileSystem.ReadFile(descendant)
	end

	local amountToTestWith = Benchmark.AmountToTestWith -- math.min(Benchmark.AmountToTestWith, length)
	local testCases = table.create(amountToTestWith)
	for index = 1, amountToTestWith do
		testCases[index] = sources[math.random(length)]
	end

	local benchmarks = {}

	benchmarks["RegEx (ultra combined v2, cached)"] = function(): {string}
		local replaced = table.create(amountToTestWith)
		for index, contents in testCases do
			if not IsMatch(IGNORE_COMBINED_COMMENT_NO_START, contents) then
				replaced[index] = contents
				continue
			end

			local splitContents = string.split(contents, "\n")

			local newContents = table.create(#splitContents)
			local size = 0

			for _, line in splitContents do
				if IsMatch(IGNORE_COMBINED_COMMENT_V2, line) then
					continue
				end

				size += 1
				newContents[size] = line
			end

			replaced[index] = table.concat(newContents, "\n")
		end
		return replaced
	end
	benchmarks["string.find (ultra)"] = function(): {string}
		local replaced = table.create(amountToTestWith)
		for index, contents in testCases do
			if
				not (string.find(contents, "//%s*biome%-ignore"))
				and not (string.find(contents, "/%*%*%s*biome%-ignore%-all"))
			then
				replaced[index] = contents
				continue
			end

			local splitContents = string.split(contents, "\n")

			local newContents = table.create(#splitContents)
			local size = 0

			for _, line in splitContents do
				if
					(string.find(line, "^(//%s*biome%-ignore)"))
					or (string.find(line, "^(/%*%*%s*biome%-ignore%-all)"))
				then
					continue
				end

				size += 1
				newContents[size] = line
			end

			replaced[index] = table.concat(newContents, "\n")
		end
		return replaced
	end
	benchmarks["ultra"] = function(): {string}
		local replaced = table.create(amountToTestWith)
		for index, contents in testCases do
			if not IsMatch(IGNORE_COMBINED_COMMENT_NO_START, contents) then
				replaced[index] = contents
				continue
			end

			local splitContents = string.split(contents, "\n")

			local newContents = table.create(#splitContents)
			local size = 0

			for _, line in splitContents do
				if
					(string.find(line, "^(//%s*biome%-ignore)"))
					or (string.find(line, "^(/%*%*%s*biome%-ignore%-all)"))
				then
					continue
				end

				size += 1
				newContents[size] = line
			end

			replaced[index] = table.concat(newContents, "\n")
		end
		return replaced
	end

	benchmarks["RegEx (combined v2, cached)"] = function(): {string}
		local replaced = table.create(amountToTestWith)
		for index, contents in testCases do
			local splitContents = string.split(contents, "\n")

			local newContents = table.create(#splitContents)
			local size = 0

			for _, line in splitContents do
				if IsMatch(IGNORE_COMBINED_COMMENT_V2, line) then
					continue
				end

				size += 1
				newContents[size] = line
			end

			replaced[index] = table.concat(newContents, "\n")
		end
		return replaced
	end
	benchmarks["RegEx (combined v2, cached)"] = function(): {string}
		local replaced = table.create(amountToTestWith)
		for index, contents in testCases do
			local splitContents = string.split(contents, "\n")

			local newContents = table.create(#splitContents)
			local size = 0

			for _, line in splitContents do
				if IsMatch(IGNORE_COMBINED_COMMENT, line) then
					continue
				end

				size += 1
				newContents[size] = line
			end

			replaced[index] = table.concat(newContents, "\n")
		end
		return replaced
	end

	benchmarks["RegEx (inline)"] = function(): {string}
		local replaced = table.create(amountToTestWith)
		for index, contents in testCases do
			local splitContents = string.split(contents, "\n")

			local newContents = table.create(#splitContents)
			local size = 0

			for _, line in splitContents do
				if IGNORE_ALL_COMMENT:isMatch(line) or IGNORE_NEXT_COMMENT:isMatch(line) then
					continue
				end

				size += 1
				newContents[size] = line
			end

			replaced[index] = table.concat(newContents, "\n")
		end
		return replaced
	end
	benchmarks["RegEx (inline, cached)"] = function(): {string}
		local replaced = table.create(amountToTestWith)
		for index, contents in testCases do
			local splitContents = string.split(contents, "\n")

			local newContents = table.create(#splitContents)
			local size = 0

			for _, line in splitContents do
				if IsMatch(IGNORE_ALL_COMMENT, line) or IsMatch(IGNORE_NEXT_COMMENT, line) then
					continue
				end

				size += 1
				newContents[size] = line
			end

			replaced[index] = table.concat(newContents, "\n")
		end
		return replaced
	end

	benchmarks["RegEx (function)"] = function(): {string}
		local replaced = table.create(amountToTestWith)
		for index, contents in testCases do
			local splitContents = string.split(contents, "\n")

			local newContents = table.create(#splitContents)
			local size = 0

			for _, line in splitContents do
				if MatchBiomeComment(line) then
					continue
				end

				size += 1
				newContents[size] = line
			end

			replaced[index] = table.concat(newContents, "\n")
		end
		return replaced
	end
	benchmarks["RegEx (function, cached)"] = function(): {string}
		local replaced = table.create(amountToTestWith)
		for index, contents in testCases do
			local splitContents = string.split(contents, "\n")

			local newContents = table.create(#splitContents)
			local size = 0

			for _, line in splitContents do
				if MatchBiomeCommentCached(line) then
					continue
				end

				size += 1
				newContents[size] = line
			end

			replaced[index] = table.concat(newContents, "\n")
		end
		return replaced
	end

	benchmarks["string.find"] = function(): {string}
		local replaced = table.create(amountToTestWith)
		for index, contents in testCases do
			local splitContents = string.split(contents, "\n")

			local newContents = table.create(#splitContents)
			local size = 0

			for _, line in splitContents do
				if
					(string.find(line, "^(//%s*biome%-ignore)"))
					or (string.find(line, "^(/%*%*%s*biome%-ignore%-all)"))
				then
					continue
				end

				size += 1
				newContents[size] = line
			end

			replaced[index] = table.concat(newContents, "\n")
		end
		return replaced
	end

	-- do
	-- 	local results = {}
	-- 	local size = 0
	-- 	for name, callback in pairs(benchmarks) do
	-- 		size += 1
	-- 		results[size] = {
	-- 			Name = name;
	-- 			Result = table.concat(callback(), "\n");
	-- 		}
	-- 	end

	-- 	-- validate the results are all the same
	-- 	local firstResult = results[1].Result
	-- 	local deadIndex: number? = nil
	-- 	for index = 2, size do
	-- 		local yeah = results[index]
	-- 		if yeah.Result ~= firstResult then
	-- 			deadIndex = index
	-- 			break
	-- 		end
	-- 	end

	-- 	if deadIndex then
	-- 		local yeah = results[deadIndex]
	-- 		local differenceString = {}
	-- 		local swag = 0

	-- 		local split = string.split(yeah.Result, "\n")
	-- 		for jndex, line in string.split(firstResult, "\n") do
	-- 			if line ~= split[jndex] then
	-- 				swag += 1
	-- 				differenceString[swag] = `[{jndex}] {Debug.TableToString({
	-- 					Expected = line;
	-- 					Actually = split[jndex];
	-- 				}, true)}`
	-- 			end
	-- 		end

	-- 		error(`Benchmark results do not match: {yeah.Name}\n{table.concat(differenceString, "\n")}`)
	-- 	end
	-- end

	SpeedTester.SpeedTester(benchmarks, {
		BarGraphMultiplier = Benchmark.BarGraphMultiplier;
		TimeThreshold = Benchmark.TimeThreshold;
		TitleText = "RegEx vs string.find Benchmark";
	})

	return 0
end

return Benchmark
