import { Service } from "typedi";
import { Logger } from "../logger";
import { Config } from "../../config";
import path from "path";

@Service()
export class SetupService {
  public constructor(private logger: Logger) {}

  public async setup(config: Config, ...args: string[]) {
    this.logger.trace("Starting setup");
    this.logger.trace(`Setup path is ${config.setup.path}`);
    this.logger.trace(`__dirname is ${__dirname}`);

    if (!config.setup.exists) {
      throw new Error("Cannot run setup without a setup script!");
    }

    let relativeModulePath = "";
    try {
      relativeModulePath = path.relative(__dirname, config.setup.path);
      this.logger.trace(`Set relative path to ${relativeModulePath}`);
    } catch (err) {
      this.logger.error("Encountered error generating relative path?!");
      this.logger.error(relativeModulePath);
      throw err;
    }

    this.logger.trace("__dirname is ", __dirname);
    this.logger.trace("relativeModulePath is ", relativeModulePath);
    this.logger.trace("config.setup.path is ", config.setup.path);

    let script: { init?: any } = {};
    try {
      script = require(relativeModulePath);
    } catch (err) {
      this.logger.error("Error requiring path in the config");
      throw err;
    }

    try {
      if (typeof script.init === "function") {
        this.logger.trace("Running setup script");
        await script
          .init(config, ...args)
          .catch((e: Error) => this.logger.error(e.name));
      } else {
        this.logger.trace("Setup script has no init function");
      }
    } catch (err) {
      this.logger.error("Error executing the init script");
    }
  }
}
