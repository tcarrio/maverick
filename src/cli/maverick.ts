import { Command } from "commander";
import { Service } from "typedi";
import { Config } from "../config";
import { internalName } from "../globals";
import { AbstractCLI } from "./abstract";
import { getVersion } from "./version";
import { Logger } from "../services/logger";
import { ToolCLI } from "./tool";
import { ComposeCLI } from "./compose";

@Service()
export class ProgramCLI extends AbstractCLI<{}> {
  public readonly name = internalName;
  public readonly description =
    "Command your arsenal of Docker containers for ultimate development";

  protected program: Command;

  public constructor(
    logger: Logger,
    config: Config,
    compose: ComposeCLI,
    tool: ToolCLI
  ) {
    super(logger, config);
    this.program = new Command(this.name)
      .description(this.description)
      .version(getVersion())
      .command("compose", "run the docker compose tooling", {
        isDefault: true
      })
      .command("tool", "run the maverick tooling")
      .parse(process.argv);
  }

  protected async invalidConfigTasks() {
    this.logger.info("Finishing maverick invalidConfigTasks");
  }
  protected async validConfigTasks() {
    this.logger.info("Finishing maverick validConfigTasks");
  }
  protected async invalidArgsHandler() {
    this.logger.info("Finishing maverick invalidArgsHandler");
  }

  protected get options(): {} {
    return {};
  }
}
