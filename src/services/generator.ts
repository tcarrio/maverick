import { Service } from "typedi";
import { Logger } from "./logger";
import { Config } from "../config";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import { ComposeBuilder } from "./builder";
import { DockerComposeDefinition } from "../@types/docker-compose";

@Service()
export class Generator {
  private readonly encoding = "utf-8";
  private readonly yamlConfig: yaml.DumpOptions = {
    noRefs: true,
    condenseFlow: true,
    skipInvalid: true,
    lineWidth: 2,
    flowLevel: -1,
    noCompatMode: false,
  };
  private compose: DockerComposeDefinition | null = null;

  public constructor(
    private logger: Logger,
    private config: Config,
    private composeBuilder: ComposeBuilder,
  ) {}

  public async generate(toFile: false): Promise<Buffer>;
  public async generate(toFile: true): Promise<void>;
  public async generate(toFile = false): Promise<Buffer | void> {
    const project = this.config.projectConfig;

    this.logger.trace(`Type of project: ${project.projectType}`);

    const compose = await this.getCompose();

    if (toFile) {
      this.logger.trace("Writing docker-compose.yml");
      this.writeToFile(compose);
    } else {
      const buffer = this.writeToBuffer(compose);
      this.logger.trace("Generated Compose buffer:");
      this.logger.trace(buffer.toString(this.encoding));
      return buffer;
    }
  }

  private async getCompose() {
    if (!this.compose) {
      this.compose = await this.composeBuilder.getDefinition();
    }

    return this.compose;
  }

  private writeToFile(compose: object) {
    fs.writeFileSync(
      path.join("/tmp", "docker-compose.yml"),
      yaml.dump(compose, this.yamlConfig),
    );
  }

  private writeToBuffer(compose: object) {
    return Buffer.from(yaml.dump(compose, this.yamlConfig), this.encoding);
  }
}
