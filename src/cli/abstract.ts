import { Command } from "commander";
import { Service } from "typedi";
import { Config } from "../config";
import { Indexable } from "../types";
import { Logger } from "../services/logger";

@Service()
export abstract class AbstractCLI<T = Indexable> {
  public abstract name: string;
  public abstract description: string;

  protected abstract program: Command;

  protected hasRun = false;
  protected _complete: Promise<void>;

  public constructor(protected logger: Logger, protected config: Config) {
    this._complete = Promise.resolve();
  }

  public get complete(): Promise<void> {
    return this._complete;
  }

  public async run() {
    this.hasRun = false;
    await this.invalidConfigTasks();
    if (!this.blockOnInvalidConfig()) {
      await this.validConfigTasks();
    } else if (this.argumentProvided()) {
      console.error(
        "We couldn't find a Maverick config - get started with `maverick tool --init`"
      );
    }
    await this.invalidArgsHandler();
  }

  protected abstract invalidConfigTasks(): Promise<void>;
  protected abstract validConfigTasks(): Promise<void>;
  protected async invalidArgsHandler(): Promise<void> {
    if (!this.hasRun) {
      this.program.outputHelp();
    }
  }

  protected blockOnInvalidConfig() {
    return !this.config.valid;
  }

  protected abstract get options(): T;

  protected argumentProvided(): boolean {
    const opts = Object.keys(this.options || {});
    // @ts-ignore
    return opts.reduce((found, key) => found || opts[key] !== undefined, false);
  }

  protected get args(): string[] {
    return this.program.args;
  }
}
