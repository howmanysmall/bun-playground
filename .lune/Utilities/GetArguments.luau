--!optimize 2
--!strict

local process = require("@lune/process")

local function GetArguments(): {string}
	local arguments = process.args
	local length = #arguments
	return table.move(arguments, 2, length, 1, table.create(length - 1))
end

return GetArguments
