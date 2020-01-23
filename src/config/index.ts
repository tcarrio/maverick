import fs, { existsSync } from "fs";
import yaml from "js-yaml";
import path from "path";
import { Service } from "typedi";
import { Logger } from "../services/logger";
import { MaverickRootConfig } from "../types";
import { ProjectNotFoundError } from "../util/errors";
import { validateConfig } from "./validator";

@Service()
export class Config {
  public readonly cwd: string;
  public readonly prerequisites: string[];
  public readonly projectName: string;
  public readonly compose: string;
  public readonly projectConfig: MaverickRootConfig;
  public readonly internalConfig: MaverickRootConfig;
  public readonly moonrakerName: string;
  public readonly moonrakerURL: string;
  public readonly projectRoot: string;

  public constructor(private logger: Logger) {
    this.cwd = process.cwd();
    this.compose = process.env.DOCKER_COMPOSE || "docker-compose";

    this.projectName = process.env.PROJECT_NAME || "singularity";
    this.projectRoot =
      (process.env.PROJECT_ROOT &&
        fs.existsSync(process.env.PROJECT_ROOT) &&
        process.env.PROJECT_ROOT) ||
      this.findRoot();

    this.moonrakerName = "moonraker";
    this.moonrakerURL =
      process.env.MOONRAKER_URL ||
      "https://bitbucket.lab.dynatrace.org/scm/dav/moonraker.git";

    this.prerequisites = ["mysql", "create-db", "migrate-db"];

    const { projectConfig, internalConfig } = this.loadConfig();
    this.projectConfig = projectConfig;
    this.internalConfig = internalConfig;
  }

  private findRoot(): string {
    return this.findFile("maverick.yml");
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
          this.logger.error("Reached the root of the filesystem");
          break;
        }

        dir = newDir;
        attempts++;
        if (attempts === maxTraversals) {
          this.logger.error(
            `Traversed ${maxTraversals} parent folders -- giving up`
          );
        }
      }
    } catch (err) {}

    this.logger.error("A valid Maverick project could not be found");
    throw new ProjectNotFoundError();
  }

  private loadConfig(): {
    internalConfig: MaverickRootConfig;
    projectConfig: MaverickRootConfig;
  } {
    const internalConfig: MaverickRootConfig = {
      batch: {},
      images: {},
      packages: {},
      services: {},
      overrides: {},
      networks: [],
      workspaceDir: "/opt",
      language: "typescript",
      projectType: "lerna"
    };

    const loadedConfig = yaml.load(
      fs
        .readFileSync(path.join(this.projectRoot, "maverick.yml"))
        .toString("utf8")
    );

    const projectConfig = validateConfig(loadedConfig, internalConfig);

    projectConfig.projectType = this.isLerna()
      ? "lerna"
      : this.isNx()
      ? "nx"
      : "unknown";

    projectConfig.dotenv = existsSync(path.join(this.projectRoot, ".env"));

    return { internalConfig, projectConfig };
  }
}
