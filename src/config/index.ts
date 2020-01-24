import fs, { existsSync } from "fs";
import yaml from "js-yaml";
import path from "path";
import { Service } from "typedi";
import { Logger } from "../services/logger";
import { MaverickRootConfig, SetupConfiguration } from "../types";
import { ProjectNotFoundError } from "../util/errors";
import { validateConfig } from "./validator";
import { IConfig } from "./interface";

@Service()
export class Config implements IConfig {
  /** if valid, all following fields will be set */
  public readonly valid: boolean = false;

  public readonly cwd: string;
  public readonly projectName!: string;
  public readonly compose!: string;
  public readonly config!: MaverickRootConfig;
  public readonly projectRoot!: string;
  public readonly setup!: SetupConfiguration;

  public constructor(private logger: Logger) {
    this.cwd = process.cwd();
    
    try {
      this.projectRoot = this.findRoot();

      this.config = this.loadConfig();
      this.compose = this.config.compose || "docker-compose";
      this.projectName = this.config.name || "maverick";

      const setupPath = path.join(this.projectRoot, (this.config.setup || "maverick.setup.js"));
      const exists = existsSync(setupPath);
      this.setup = { exists, path: exists ? setupPath : "" }

      this.valid = true;
    } catch (err) {
      this.logger.debug(`Encountered ${err.name} during configuration`);
    }
  }

  private findRoot(): string {
    try {
      return this.findFile("maverick.yml");
    } catch (err) {
      this.logger.debug("A valid Maverick project could not be found");
      throw err;
    }      
  }

  private isLerna(): boolean {
    try {
      this.findFile("lerna.json", 50);
      return true;
    } catch (err) {
      return false;
    }
  }

  private isNx(): boolean {
    try {
      this.findFile("nx_file_or_whatever", 50);
      return true;
    } catch (err) {
      return false;
    }
  }

  private findFile(searchFile: string, maxTraversals = 50): string {
    try {
      let dir = this.cwd;
      let attempts = 0;
      while (attempts < maxTraversals) {
        const contents = fs.readdirSync(dir);
        const index = contents.indexOf(searchFile);
        if (index > -1) {
          return dir;
        }
        const newDir = path.join(dir, "..");

        if (newDir === dir) {
          this.logger.debug("Reached the root of the filesystem");
          break;
        }

        dir = newDir;
        attempts++;
        if (attempts === maxTraversals) {
          this.logger.debug(
            `Traversed ${maxTraversals} parent folders -- giving up`
          );
        }
      }
    } catch (err) {}    
    throw new ProjectNotFoundError();
  }

  private loadConfig(): MaverickRootConfig {
    const loadedConfig = yaml.load(
      fs
        .readFileSync(path.join(this.projectRoot, "maverick.yml"))
        .toString("utf8")
    );

    const projectConfig = validateConfig(loadedConfig, defaultConfig);

    projectConfig.projectType = this.isLerna()
      ? "lerna"
      : this.isNx()
      ? "nx"
      : "unknown";

    projectConfig.dotenv = existsSync(path.join(this.projectRoot, ".env"));

    return projectConfig;
  }
}

export const defaultConfig: MaverickRootConfig = {
  batch: {},
  images: {},
  packages: {},
  services: {},
  overrides: {},
  networks: [],
  workspaceDir: "/opt",
  language: "typescript",
  projectType: "lerna",
};