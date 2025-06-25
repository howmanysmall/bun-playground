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
local process = require("@lune/process")

local Array = LuauPolyfill.Array

local CWD = PathFileSystem.CWD
local SOURCE = CWD:join("src")

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
}
local undo = UndoableRename(SOURCE, CWD:join("src-temp"))

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
