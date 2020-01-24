import { Logger } from "./logger";
import { defaultConfig, Config } from "../config";
import { Service } from "typedi";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";

@Service()
export class InitService {
    public constructor(private logger: Logger, private config: Config) {}

    public init() {
        try {
            const yamlConfig = yaml.dump(defaultConfig);
            this.logger.trace("Loaded default config to YAML");
            const outputPath = path.join(this.config.cwd, "maverick.yml");
            this.logger.trace(`Writing config to ${outputPath}`);
            fs.writeFileSync(outputPath, yamlConfig);
            this.logger.trace("Finished writing config");
        } catch (err) {
            this.logger.error(`Failed to write Maverick config due to an error (${err.name})`);
        }
    }
}