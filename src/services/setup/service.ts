import fs from "fs";
import path from "path";
import { Service } from "typedi";
import { Config } from "../../config";
import { MoonrakerExistsError } from "../../util/errors";
import { Runner } from "../process";
import { setupCommands } from "./commands";
import { PlatformCommands } from "./types";
import { Logger } from "../logger";

@Service()
export class SetupService {
  private readonly platformSetupCommands: PlatformCommands;
  private readonly rootDir: string;

  public constructor(
    private runner: Runner,
    private config: Config,
    private logger: Logger,
  ) {
    this.platformSetupCommands = setupCommands(config);
    this.rootDir = config.projectRoot;
  }

  public async setup(url?: string) {
    if (this.moonrakerExists()) {
      throw new MoonrakerExistsError();
    }

    let commands = this.platformSetupCommands;
    if (url) {
      this.logger.trace("Overriding moonraker URL:", url);
      commands = setupCommands({
        ...this.config,
        moonrakerURL: url,
      });
    }

    const platform = process.platform;
    this.logger.trace(`Setting up using the ${platform} script`);
    const entry = commands[platform];
    if (entry instanceof Error) {
      throw entry;
    }
    return this.runner.execLog(entry);
  }

  private moonrakerExists(): boolean {
    const moonrakerDir = path.join(
      this.rootDir,
      "..",
      this.config.moonrakerName,
    );
    return fs.existsSync(moonrakerDir);
  }
}
