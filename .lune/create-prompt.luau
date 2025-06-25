--!optimize 2
--!strict
--[=[ lunar
	about = "Creates a prompt for sending to some LLM."
	args = ""
]=]

local Execute = require("@utilities/Execute")
local GetArguments = require("@utilities/GetArguments")
local LuauPolyfill = require("@packages/LuauPolyfill")
local PathFileSystem = require("@packages/PathFileSystem")
local RegEx = require("@lune/regex")
local process = require("@lune/process")

local Array = LuauPolyfill.Array

local CWD = PathFileSystem.CWD
local SOURCE = CWD:join("src")

-- local IGNORE_ALL_COMMENT = RegEx.new("^(\\/\\*\\*\\s*biome-ignore-all)")
-- local IGNORE_NEXT_COMMENT = RegEx.new("^(\\/\\/\\s*biome-ignore)")
local IGNORE_COMBINED_COMMENT_NO_START = RegEx.new("(\\/\\/\\s*biome-ignore|\\/\\*\\*\\s*biome-ignore-all)")
local IsMatch = IGNORE_COMBINED_COMMENT_NO_START.isMatch

local function UndoableRename(originalPath: PathFileSystem.Path, newPath: PathFileSystem.Path): () -> ()
	PathFileSystem.Copy(originalPath, newPath, true)

	return function(): ()
		PathFileSystem.RemoveDirectory(originalPath)
		PathFileSystem.Copy(newPath, originalPath, true)
		PathFileSystem.RemoveDirectory(newPath)
	end
end

-- local Captures = IGNORE_ALL_COMMENT.captures
-- local GetCapture = (Captures(RegEx.new("."), "1") :: RegEx.RegexCaptures).get

-- local function UnpackCaptures(captures: RegEx.RegexCaptures?): string?
-- 	if not captures or #captures == 0 then
-- 		return nil
-- 	end

-- 	local first = GetCapture(captures, 1)
-- 	return if first then first.text else nil
-- end

-- print(
-- 	UnpackCaptures(Captures(IGNORE_ALL_COMMENT, "/** biome-ignore-all lint/suspicious/noConstEnum: <explanation> */"))
-- )
-- -- print(IGNORE_ALL_COMMENT:captures("// biome-ignore lint/suspicious/noConstEnum: not built"))
-- -- print(IGNORE_NEXT_COMMENT:captures("/** biome-ignore-all lint/suspicious/noConstEnum: <explanation> */"))
-- print(UnpackCaptures(Captures(IGNORE_NEXT_COMMENT, "// biome-ignore lint/suspicious/noConstEnum: not built")))
-- process.exit()

local function MatchBiomeComment(line: string): boolean
	return IsMatch(IGNORE_ALL_COMMENT, line) or IsMatch(IGNORE_NEXT_COMMENT, line)
end

local IGNORE_GLOBS = {
	"**/__tests__";
	"*.test.ts";
	"*.spec.ts";
}
local undo = UndoableRename(SOURCE, CWD:join("src-temp"))

for _, descendant in PathFileSystem.GetDescendants(SOURCE) do
	if not PathFileSystem.IsFile(descendant) then
		continue
	end

	local contents = PathFileSystem.ReadFile(descendant)
	if not IsMatch(IGNORE_COMBINED_COMMENT_NO_START, contents) then
		continue
	end

	local splitContents = string.split(contents, "\n")
	local newContents = table.create(#splitContents)
	local size = 0

	for _, line in splitContents do
		if (string.find(line, "^(//%s*biome%-ignore)")) or (string.find(line, "^(/%*%*%s*biome%-ignore%-all)")) then
			continue
		end

		size += 1
		newContents[size] = line
	end

	PathFileSystem.WriteFile(descendant, table.concat(newContents, "\n"))
end

local arguments = Array.concat({
	"code2prompt";
	"--exclude";
	string.format("%q", table.concat(IGNORE_GLOBS, ","));
	SOURCE:toString();
}, GetArguments())

local result = Execute(arguments, {
	cwd = CWD:toString();
	shell = true;
	stdio = "forward";
})

undo()
result:Assert()
