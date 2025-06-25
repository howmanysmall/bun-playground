--!optimize 2
--!strict
--[=[ lunar
	about = "Creates a prompt for sending to some LLM."
	args = ""
]=]

local Chalk = require("@packages/Chalk")
local Execute = require("@utilities/Execute")
local GetArguments = require("@utilities/GetArguments")
local GitUtilities = require("@utilities/GitUtilities")
local LuauPolyfill = require("@packages/LuauPolyfill")
local PathFileSystem = require("@packages/PathFileSystem")
local RegEx = require("@lune/regex")
local process = require("@lune/process")

local Array = LuauPolyfill.Array
local console = LuauPolyfill.console

local CWD = PathFileSystem.CWD
local YELLOW_BOLD = Chalk.Yellow .. Chalk.Bold
local SOURCE = CWD:join("src")

local IGNORE_COMBINED_COMMENT_NO_START = RegEx.new("(\\/\\/\\s*biome-ignore|\\/\\*\\*\\s*biome-ignore-all)")
local IsMatch = IGNORE_COMBINED_COMMENT_NO_START.isMatch

if not PathFileSystem.IsDirectory(SOURCE) then
	print()
	console.warn(
		`Source directory not found at {SOURCE:toString()}. Please run this script from the root of the project.`
	)
	process.exit(1)
end

-- make sure source does not have any uncommitted changes
local gitChanges = GitUtilities.GetGitChanges(SOURCE)
if gitChanges.HasChanges then
	print()
	console.error(
		`Uncommitted changes found in {SOURCE:toString()}. Please stage your changes before running this script.\n\n{YELLOW_BOLD(
			table.concat(Array.map(string.split(gitChanges.Stdout, "\n"), function(line: string): string
				return `- {(string.gsub(line, "^M%s", ""))}`
			end), "\n")
		)}`
	)
	process.exit(1)
end

local function UndoableRename(originalPath: PathFileSystem.Path, newPath: PathFileSystem.Path): () -> ()
	PathFileSystem.Copy(originalPath, newPath, true)

	return function(): ()
		PathFileSystem.RemoveDirectory(originalPath)
		PathFileSystem.Copy(newPath, originalPath, true)
		PathFileSystem.RemoveDirectory(newPath)
	end
end

local IGNORE_GLOBS = {
	"**/__tests__";
	"*.test.ts";
	"*.spec.ts";
	"rank-cities-plus.ts";
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
		if (string.find(line, "// biome-ignore", 1, true)) or (string.find(line, "/** biome-ignore-all", 1, true)) then
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
