import path from "node:path";
import { applicationPaths } from "utilities/application-constants";
import winston from "winston";
import { name } from "../../package.json";

const logger = winston.createLogger({
	defaultMeta: { service: name },
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json(), // Use JSON format for logs
	),
	level: "info",
	transports: [
		new winston.transports.File({
			// Log to file
			filename: path.join(applicationPaths.log, "error.log"),
			level: "error",
		}),
		new winston.transports.File({
			// Log to file
			filename: path.join(applicationPaths.log, "combined.log"),
		}),
	],
});

if (process.env.NODE_ENV !== "production") {
	logger.add(
		new winston.transports.Console({
			format: winston.format.combine(
				winston.format.cli(),
				winston.format.colorize(), // Colorize output in console
				winston.format.simple(),
			),
		}),
	);
}

export default logger;
