--!optimize 2
--!strict

local LuauPolyfill = require("@packages/LuauPolyfill")
local PathFileSystem = require("@packages/PathFileSystem")

local String = LuauPolyfill.String
local Symbol = LuauPolyfill.Symbol
local console = LuauPolyfill.console

local GitUtilities = {}

type None = unknown & {__none_marker__: "__never__"}
local None: None = Symbol("None")

local gitUrl: None | string | nil = None

local function GetUrlFromConfiguration(): string?
	if gitUrl == None then
		local configurationPath = PathFileSystem.CWD:join(".git"):join("config")
		if not PathFileSystem.FastExists(configurationPath) then
			gitUrl = nil
			return nil
		end

		local urlMatch = (string.match(PathFileSystem.ReadFile(configurationPath), "url%s*=%s*([^\n]+)"))
		if not urlMatch then
			gitUrl = nil
			return nil
		end

		local url = String.trim(urlMatch)
		gitUrl = url
		return url
	end

	return gitUrl :: string?
end
GitUtilities.GetUrlFromConfiguration = GetUrlFromConfiguration

local function GetRepositoryNameFromConfiguration(url: string?): string?
	local repositoryUrl = url or GetUrlFromConfiguration()
	return if repositoryUrl then (string.match(repositoryUrl, "/([^/]+)%.git$")) else nil
end
GitUtilities.GetRepositoryNameFromConfiguration = GetRepositoryNameFromConfiguration

export type RepositoryData = {
	Name: string,
	Success: true,
	Url: string,
} | {
	Error: string,
	Success: false,
}

function GitUtilities.GetRepositoryData(): RepositoryData
	local repositoryUrl = GetUrlFromConfiguration()
	if not repositoryUrl then
		return {
			Error = "Failed to determine the repository URL. Make sure you are in a git repository.";
			Success = false;
		}
	end

	local repositoryName = GetRepositoryNameFromConfiguration(repositoryUrl)
	if not repositoryName then
		return {
			Error = `Failed to determine the repository name from URL: {repositoryUrl}. Make sure the URL is valid and ends with '.git'.`;
			Success = false;
		}
	end

	return {
		Name = repositoryName;
		Success = true;
		Url = repositoryUrl;
	}
end

function GitUtilities.GetGuaranteedRepositoryName(): string
	local repositoryName = GetRepositoryNameFromConfiguration()
	if repositoryName then
		return repositoryName
	end

	local folderName = PathFileSystem.CWD:fileName()
	if not folderName then
		console.warn("Failed to determine the current working directory name.")
		return "bun-cli-template"
	end

	return folderName
end

return table.freeze(GitUtilities)
