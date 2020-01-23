import { MaverickRootConfig } from "../types";
import { InvalidConfigFileError } from "../util/errors";
import { union } from "../util/union";

export function validateConfig(
  config: MaverickRootConfig,
  defaults: MaverickRootConfig,
): MaverickRootConfig {
  if (!config) {
    throw new InvalidConfigFileError("maverick.yml file was invalid");
  }

  return union(defaults, config);
}
