import { Command } from "commander";
import { Service } from "typedi";
import { Config } from "../config";
import { internalName } from "../globals";
import { ComposeService } from "../services/compose";
import { Logger } from "../services/logger";
import { AbstractCLI } from "./abstract";
import { OptionalString, OptionalStrings } from "./types";
import { getVersion } from "./version";

@Service()
export class ComposeCLI extends AbstractCLI<DockerComposeCLIOptions> {
  public readonly name = `${internalName}-compose`;
  public readonly description = "Docker Compose management";

  protected program: Command;

  public constructor(
    private compose: ComposeService,
    logger: Logger,
    config: Config
  ) {
    super(logger, config);
    this.program = new Command(this.name)
      .description(this.description)
      .version(getVersion())
      .usage("[action]")
      .option(
        "-b, --build",
        "build all or certain services in the docker-compose.yml"
      )
      .option(
        "-d, --down",
        "take down all or certain services in the docker-compose.yml"
      )
      .option(
        "-u, --up",
        "launch a certain or all of the database, redis, and services"
      )
      .option("-r, --restart", "restart service name(s)")
      .option(
        "-R, --reload",
        "reload services with updates to env_file and docker-compose.yml"
      )
      .option(
        "-l, --list [filter]",
        "list services currently defined for local development"
      )
      .option("-p, --ps", "List existing containers")
      .parse(process.argv);
  }

  protected async invalidConfigTasks() {}

  protected async validConfigTasks(): Promise<void> {
    const options = this.options;

    if (options.build) {
      this.hasRun = true;
      await this.compose.build(this.args);
    }

    if (options.down) {
      this.hasRun = true;
      await this.compose.down(this.args);
    }

    if (options.up) {
      this.hasRun = true;
      await this.compose.up(this.args);
    }

    if (options.restart) {
      this.hasRun = true;
      await this.compose.restart(this.args);
    }

    if (options.reload) {
      this.hasRun = true;
      await this.compose.down(this.args);
      await this.compose.up(this.args);
    }

    if (options.ps) {
      this.hasRun = true;
      await this.compose.ps();
    }

    if (options.list) {
      this.hasRun = true;
      await this.compose.list(...this.args);
    }
  }

  protected get options(): DockerComposeCLIOptions {
    const options = {
      build: this.program.build,
      down: this.program.down,
      list: this.program.list,
      ps: this.program.ps,
      reload: this.program.reload,
      restart: this.program.restart,
      up: this.program.up
    };

    return options;
  }
}

export type DockerComposeCLIOptions = Partial<{
  build: OptionalStrings;
  down: OptionalStrings;
  list: OptionalString;
  ps: boolean;
  reload: OptionalStrings;
  restart: OptionalStrings;
  up: OptionalStrings;
}>;
