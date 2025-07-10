import envPaths, { type Paths } from "env-paths";
import { name } from "../../package.json";

export const applicationPaths: Paths = envPaths(name);
