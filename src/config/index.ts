import fs, { existsSync } from "fs";
import yaml from "js-yaml";
import template from "lodash.template";
import path from "path";
import { Service } from "typedi";
import { Logger } from "../services/logger";
import {
  ConfigFileNotFoundError,
  InvalidConfigFileError,
  ProjectNotFoundError,
} from "../util/errors";
import { MaverickRootConfig, Templates, TemplateOptions } from "../types";
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
  public readonly templates: Templates;

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

    this.templates = this.createTemplates();

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
            `Traversed ${maxTraversals} parent folders -- giving up`,
          );
        }
      }
    } catch (err) {}

    this.logger.error("A valid Maverick project could not be found");
    throw new ProjectNotFoundError();
  }

  private createTemplates(): Templates {
    this.logger.trace("Creating templates from @davis/maverick");
    let raw!: TemplateOptions;
    let templates: Templates = {};

    const defaultTemplatePath = path.join(
      __dirname,
      "..",
      "..",
      "templates.yml",
    );
    if (!fs.existsSync(defaultTemplatePath)) {
      throw new ConfigFileNotFoundError();
    }

    this.logger.trace("Loading project config:", defaultTemplatePath);
    const content = fs.readFileSync(defaultTemplatePath, "utf-8");
    const parsed = yaml.load(content);
    if (!parsed.templates) {
      throw new InvalidConfigFileError();
    }
    raw = Object.assign({}, parsed.templates) as TemplateOptions;

    const projectConfigPath = path.join(this.projectRoot, "templates.yml");
    if (fs.existsSync(projectConfigPath)) {
      this.logger.trace("Loading project config:", projectConfigPath);
      const content = fs.readFileSync(projectConfigPath, "utf-8");
      const parsed = yaml.load(content);
      if (parsed.templates) {
        raw = Object.assign({}, parsed.templates) as TemplateOptions;
      }
    }

    for (const key of Object.keys(raw)) {
      this.logger.trace("Setting template", key);
      templates[key] = template(raw![key]);
    }

    return templates;
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
      projectType: "lerna",
    };

    const loadedConfig = yaml.load(
      fs
        .readFileSync(path.join(this.projectRoot, "maverick.yml"))
        .toString("utf8"),
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
