--!optimize 2
--!strict
--[=[ lunar
	about = "Sets up the repository for you."
	args = "[-h] [--name <name>] [--description <description>] [-v]"
]=]

local ArgParse = require("@packages/ArgParse")
local GitUtilities = require("@utilities/GitUtilities")
local GreenTea = require("@packages/GreenTea")
local JsonPromise = require("@promises/JsonPromise")
local LuauPolyfill = require("@packages/LuauPolyfill")
local PathFileSystem = require("@packages/PathFileSystem")
local process = require("@lune/process")

local console = LuauPolyfill.console
type Path = PathFileSystem.Path

local repositoryData = GitUtilities.GetRepositoryData()
if not repositoryData.Success then
	console.error(repositoryData.Error)
	process.exit(1)
	assert(false, "unreachable")
end

local url = repositoryData.Url

local parser = ArgParse("setup", "Sets up the repository for you.")
parser:option("--description", "The description of the repository.", nil, nil)
parser:option("--name", `The name of the repository. (default: {repositoryData.Name})`, repositoryData.Name)
parser:flag("-v --verbose", "Enable verbose output")

local arguments: {
	description: string?,
	name: string,
	verbose: boolean?,
} = parser:parse()

local description = arguments.description
local name = arguments.name
local verbose = arguments.verbose

if verbose then
	console.log(`Setting up repository {name}`)
end

type UpdateEntry = {
	Function: (path: Path, contents: string) -> {() -> ()},
	Path: Path,
}

local CWD = PathFileSystem.CWD
local function GetLazyReplace(path: Path, contents: string): () -> ()
	local newContents = (string.gsub(contents, "bun%-cli%-template", name))
	local function replace(): ()
		PathFileSystem.WriteFile(path, newContents)
	end
	return replace
end

local IsPackageJsonRaw = {
	bugs = GreenTea.optional({
		email = GreenTea.optional(GreenTea.string());
		url = GreenTea.optional(GreenTea.string());
	});
	dependencies = GreenTea.optional({[GreenTea.string()] = GreenTea.string()});
	description = GreenTea.optional(GreenTea.string());
	devDependencies = GreenTea.optional({[GreenTea.string()] = GreenTea.string()});
	homepage = GreenTea.optional(GreenTea.string());
	license = GreenTea.optional(GreenTea.string());
	module = GreenTea.optional(GreenTea.string());
	name = GreenTea.optional(GreenTea.string());
	peerDependencies = GreenTea.optional({[GreenTea.string()] = GreenTea.string()});
	private = GreenTea.optional(GreenTea.boolean());
	repository = GreenTea.optional({
		type = GreenTea.optional(GreenTea.string());
		url = GreenTea.optional(GreenTea.string());
	});
	scripts = GreenTea.optional({[GreenTea.string()] = GreenTea.string()});
	type = GreenTea.optional(GreenTea.union(GreenTea.literal("module"), GreenTea.literal("commonjs"))) :: "commonjs" | "module" | nil;
	version = GreenTea.optional(GreenTea.string());
}

local TO_UPDATE: {UpdateEntry} = {
	{
		Function = function(path: Path, contents: string): {() -> ()}
			return {GetLazyReplace(path, contents)}
		end;
		Path = CWD:join("README.md");
	};

	{
		Function = function(path: Path, contents: string): {() -> ()}
			return {
				GetLazyReplace(path, contents);
				function(): ()
					PathFileSystem.Rename(path, CWD:join(`{name}.code-workspace`))
				end;
			}
		end;
		Path = CWD:join("bun-cli-template.code-workspace");
	};

	{
		Function = function(path: Path, contents: string): {() -> ()}
			return {
				function(): ()
					local jsonTable = JsonPromise.DecodeCachedAsync(contents, IsPackageJsonRaw):Expect()
					jsonTable.description = description or jsonTable.description
					jsonTable.name = name

					jsonTable.bugs = {url = (string.gsub(url, "%.git$", "/issues"))}
					jsonTable.homepage = (string.gsub(url, "%.git$", "#readme"))

					local scripts = jsonTable.scripts
					if scripts then
						local newScripts = table.clone(scripts)
						for key, value in scripts do
							newScripts[key] = (string.gsub(value, "bun%-cli%-template", name))
						end
						jsonTable.scripts = newScripts
					end

					local jsonData = JsonPromise.EncodeAsync(jsonTable, JsonPromise.FormatType.ProperPretty):Expect()
					PathFileSystem.WriteFile(path, jsonData)
				end;
			}
		end;
		Path = CWD:join("package.json");
	};
}

for _, entry in TO_UPDATE do
	local path = entry.Path
	if not PathFileSystem.FastExists(path) then
		console.warn(`File {path} does not exist, skipping.`)
		continue
	end

	if verbose then
		console.log(`Updating {path}...`)
	end

	local contents = PathFileSystem.ReadFile(path)
	if not contents then
		console.warn(`Failed to read file {path}, skipping.`)
		continue
	end

	local updates = entry.Function(path, contents)
	if #updates == 0 then
		console.log(`No updates needed for {path}`)
		continue
	end

	for _, update in updates do
		update()
	end
end
