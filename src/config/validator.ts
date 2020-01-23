import { MaverickRootConfig } from "../types";
import { InvalidConfigFileError } from "../util/errors";

export function validateConfig(
  config: MaverickRootConfig,
  defaults: MaverickRootConfig,
): MaverickRootConfig {
  if (!config) {
    throw new InvalidConfigFileError("maverick.yml file was invalid");
  }

  return {
    ...defaults,
    ...config,
  };
}
