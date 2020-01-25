import { Command } from "commander";
import { Service } from "typedi";
import { Config } from "../config";
import { internalName } from "../globals";
import { FlightControlService } from "../services/flight-control";
import { InitService } from "../services/init";
import { Logger } from "../services/logger";
import { AbstractCLI } from "./abstract";
import { collectStrings, parseString } from "./util";
import { getVersion } from "./version";
import { SetupService } from "../services/setup";
import { Generator } from "../services/generator";

@Service()
export class ToolCLI extends AbstractCLI<ToolOptions> {
  public readonly name = `${internalName}-tool`;
  public readonly description = "Maverick Tools";

  protected program: Command;

  public constructor(
    private flightControl: FlightControlService,
    private generator: Generator,
    private initService: InitService,
    private setup: SetupService,
    logger: Logger,
    config: Config
  ) {
    super(logger, config);
    this.program = new Command(this.name)
      .description(this.description)
      .version(getVersion())
      .usage("[action]")
      .option(
        "-s, --setup",
        "runs the setup script provided by the project",
        collectStrings,
        false
      )
      .option(
        "-n, --ngrok [subdomain] [auth_token]",
        "Persist your subdomain and auth token to the Maverick config"
      )
      .option(
        "-g, --generate",
        "Generate a new Docker Compose using the maverick.yml config"
      )
      .option(
        "-i, --init",
        "Initialize a Maverick configuration in the current directory"
      )
      .parse(process.argv);
  }

  protected async invalidConfigTasks(): Promise<void> {
    if (this.options.init) {
      this.hasRun = true;
      this.initService.init();
    }

    if (this.options.setup) {
      this.hasRun = true;
      const args = parseString(this.options.setup);
      await this.runSetup(...args);
    }

    this.logger.info("Finishing tool invalidConfigTask");
  }

  protected async validConfigTasks(): Promise<void> {
    if (this.options.ngrok) {
      this.hasRun = true;
      this.flightControl.ngrok(...this.args);
    }

    if (this.options.generate) {
      this.hasRun = true;
      this.logger.trace("Generating docker-compose.yml");
      await this.generator.generate(true);
    }

    this.logger.info("Finishing tool validConfigTasks");
  }

  protected get options(): ToolOptions {
    return {
      generate: this.program.generate,
      init: this.program.init,
      ngrok: this.program.ngrok,
      setup: this.program.setup
    };
  }

  private async runSetup(...args: string[]): Promise<void> {
    await this.setup.setup(this.config, ...args).catch((err: Error) => {
      this.logger.error(`Unhandled error during setup: ${err.name}`);
    });
  }
}

export type OptionalStrings = string[] | boolean;
export type OptionalString = string | boolean;
export type ToolOptions = Partial<{
  generate: boolean;
  init: boolean;
  ngrok: boolean;
  setup: OptionalString;
}>;
