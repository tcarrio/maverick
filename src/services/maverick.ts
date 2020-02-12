import { Service } from "typedi";
import { Options, ProgramBuilder } from "../cli/program";
import { ComposeService } from "./compose";
import { FlightControlService } from "./flight-control";
import { Logger } from "./logger";
import { SetupService } from "./setup";
import { Generator } from "./generator";
import { Config } from "../config";
import { InitService } from "./init";
import { convertToSafe } from "../util/safe-name";

@Service()
export class Maverick {
  private options: Options;
  private args: string[];

  public constructor(
    private logger: Logger,
    private setup: SetupService,
    private compose: ComposeService,
    private flightControl: FlightControlService,
    private program: ProgramBuilder,
    private generator: Generator,
    private initService: InitService,
    private config: Config
  ) {
    this.options = program.getOptions();
    this.args = this.translateArgs(program.getArgs());
  }

  public async run() {
    this.logger.trace("Options =", JSON.stringify(this.options));
    let hasRun = false;

    try {
      if (this.options.init) {
        return this.initService.init();
      }

      if (this.options.setup) {
        const args = parseString(this.options.setup);
        return this.runSetup(...args);
      }

      // No further actions are allowed without a valid config
      if (!this.config.valid) {
        console.error(
          "Uh oh, no Maverick configuration was found. Run `maverick --init` to get started.\n\n"
        );
        this.program.getHelp();
        return;
      }

      if (this.options.build) {
        hasRun = true;
        await this.compose.build(this.args);
      }

      if (this.options.down) {
        hasRun = true;
        await this.compose.down(this.args);
      }

      if (this.options.delete) {
        hasRun = true;
        await this.compose.delete(this.args);
      }

      if (this.options.up) {
        hasRun = true;
        await this.compose.up(this.args);
      }

      if (this.options.restart) {
        hasRun = true;
        await this.compose.restart(this.args);
      }

      if (this.options.reload) {
        hasRun = true;
        await this.compose.down(this.args);
        await this.compose.up(this.args);
      }

      if (this.options.ps) {
        hasRun = true;
        await this.compose.ps();
      }

      if (this.options.list) {
        hasRun = true;
        await this.flightControl.list(...this.args);
      }

      if (this.options.ngrok) {
        hasRun = true;
        this.flightControl.ngrok(...this.args);
      }

      if (this.options.generate) {
        hasRun = true;
        this.logger.trace("Generating docker-compose.yml");
        await this.generator.generate(true);
      }
    } catch (err) {}

    if (!hasRun) {
      this.program.getHelp();
    }
  }

  private async runSetup(...args: string[]): Promise<void> {
    await this.setup.setup(this.config, ...args).catch((err: Error) => {
      this.logger.error(`Unhandled error during setup: ${err.name}`);
    });
  }

  private translateArgs(args: string[]): string[] {
    return args.map(convertToSafe);
  }
}

function parseString(input: string | true): [string] | [] {
  const url: [string] | [] = typeof input === "string" ? [input] : [];
  return url;
}
