import { Service } from "typedi";
import { Logger } from "./logger";
import { Config } from "../config";
import fs from "fs";
import path from "path";
import { InvalidArgumentsError } from "../util/errors";
import { GenerateDockerCompose } from "../util/generate-compose";
import { ComposeBuilder } from "./builder";

@Service()
export class FlightControlService {
  public constructor(
    private logger: Logger,
    private config: Config,
    private composeBuilder: ComposeBuilder,
  ) {}

  @GenerateDockerCompose()
  public async list(filter?: string) {
    const compose = await this.composeBuilder.getDefinition();

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
