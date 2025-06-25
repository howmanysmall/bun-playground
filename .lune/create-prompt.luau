--!optimize 2
--!strict
--[=[ lunar
	about = "Creates a prompt for sending to some LLM."
	args = ""
]=]

local Execute = require("@utilities/Execute")
local LuauPolyfill = require("@packages/LuauPolyfill")
local PathFileSystem = require("@packages/PathFileSystem")
local process = require("@lune/process")

local Array = LuauPolyfill.Array

local CWD = PathFileSystem.CWD

local function UndoableRename(originalPath: PathFileSystem.Path, newPath: PathFileSystem.Path): () -> ()
	PathFileSystem.Copy(originalPath, newPath, true)

	return function(): ()
		PathFileSystem.RemoveDirectory(originalPath)
		PathFileSystem.Copy(newPath, originalPath, true)
		PathFileSystem.RemoveDirectory(newPath)
	end
end

local SOURCE = CWD:join("src")
local undo = UndoableRename(SOURCE, CWD:join("src-temp"))

local arguments = Array.concat({
	"code2prompt";
	"--exclude";
	"\"**/__tests__,*.test.ts\"";
	SOURCE:toString();
}, process.args)

local result = Execute(arguments, {
	cwd = CWD:toString();
	shell = true;
	stdio = "forward";
})

undo()
result:Assert()
