import { Service } from "typedi";
import { Logger } from "./logger";
import { Config } from "../config";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import { ReadComposeError, InvalidArgumentsError } from "../util/errors";
import { Runner } from "./process";

@Service()
export class FlightControlService {
  private readonly file: string = "docker-compose.yml";
  public constructor(
    private logger: Logger,
    private config: Config,
    private runner: Runner,
  ) {}

  public list(filter?: string) {
    try {
      const filePath = path.join(this.config.projectRoot, this.file);
      const content = fs.readFileSync(filePath, "utf-8");
      const compose = yaml.safeLoad(content);

      if (compose.services) {
        const services = Object.keys(compose.services);
        const svcToLog = services
          .filter(s => s.indexOf(filter || "") > -1)
          .map(s => "\n\t" + s)
          .join("");
        this.logger.info("Found the following services:", svcToLog);
      } else {
        this.logger.info("Services were not found in the docker-compose.yml");
      }
    } catch {
      throw new ReadComposeError();
    }
  }

  public async ps() {
    await this.runner.spawn(this.config.compose, ["ps"], {
      cwd: this.config.projectRoot,
    });
  }

  public ngrok(...args: string[]) {
    if (args.length !== 2) {
      throw new InvalidArgumentsError();
    }

    fs.writeFileSync(
      path.join(this.config.projectRoot, ".maverick"),
      `NGROK_SUBDOMAIN=${args[0]}
NGROK_AUTH=${args[1]}`,
    );
  }
}
