import { Service } from "typedi";
import { Options, ProgramBuilder } from "../cli/program";
import { MoonrakerExistsError } from "../util/errors";
import { ComposeService } from "./compose";
import { FlightControlService } from "./flight-control";
import { Logger } from "./logger";
import { SetupService } from "./setup";
import { Generator } from "./generator";

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
  ) {
    this.options = program.getOptions();
    this.args = program.getArgs();
  }

  public async run() {
    this.logger.trace("Options =", JSON.stringify(this.options));
    let hasRun = false;

    try {
      if (this.options.init) {
        const args = parseString(this.options.init);
        return this.init(...args);
      }

      if (this.options.build) {
        hasRun = true;
        await this.compose.build(this.args);
      }

      if (this.options.down) {
        hasRun = true;
        await this.compose.down(this.args);
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

      if (this.options.list) {
        hasRun = true;
        this.flightControl.list(...this.args);
      }

      if (this.options.ps) {
        hasRun = true;
        await this.flightControl.ps();
      }

      if (this.options.ngrok) {
        hasRun = true;
        this.flightControl.ngrok(...this.args);
      }

      if (this.options.generate) {
        hasRun = true;
        this.logger.trace("Generating docker-compose.yml");
        this.generator.generate(true);
      }
    } catch (err) {}

    if (!hasRun) {
      this.program.getHelp();
    }
  }

  private async init(url?: string): Promise<void> {
    await this.setup.setup(url).catch((err: Error) => {
      if (err instanceof MoonrakerExistsError) {
        return this.logger.warn("Moonraker exists already! Exiting...");
      }
      this.logger.error(`Unhandled error: ${err.name}`);
    });
  }
}

function parseString(input: string | true): [string] | [] {
  const url: [string] | [] = typeof input === "string" ? [input] : [];
  return url;
}
