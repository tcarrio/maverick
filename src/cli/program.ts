import { Command } from "commander";

import { getVersion } from "./version";
import { getDescription } from "./description";
import { Service } from "typedi";

@Service()
export class ProgramBuilder {
  private program: Command;
  public constructor() {
    this.program = new Command("maverick")
      .description(getDescription())
      .version(getVersion())
      .usage("[action]")
      .option(
        "-b, --build",
        "build all or certain services in the docker-compose.yml",
      )
      .option(
        "-d, --down",
        "take down all or certain services in the docker-compose.yml",
      )
      .option(
        "-u, --up",
        "launch a certain or all of the database, redis, and services",
      )
      .option("-r, --restart", "restart service name(s)")
      .option(
        "-R, --reload",
        "reload services with updates to env_file and docker-compose.yml",
      )
      .option(
        "-i, --init [url]",
        "initialize the project, cloning moonraker and checking for required",
        collectStrings,
        false,
      )
      .option(
        "-l, --list [filter]",
        "list services currently defined for local development",
      )
      .option("-p, --ps", "List existing containers")
      .option(
        "-t, --template <type>",
        "Generate the type of template for services",
      )
      .option(
        "-n, --ngrok [subdomain] [auth_token]",
        "Persist your subdomain and auth token to the Maverick config",
      )
      .option(
        "-g, --generate",
        "Generate a new Docker Compose using the maverick.yml config",
      )
      .parse(process.argv);
  }

  public getOptions(): Options {
    const options = {
      build: this.program.build,
      down: this.program.down,
      up: this.program.up,
      restart: this.program.restart,
      reload: this.program.reload,
      init: this.program.init,
      list: this.program.list,
      ps: this.program.ps,
      template: this.program.template,
      ngrok: this.program.ngrok,
      generate: this.program.generate,
    };

    return options;
  }

  public getArgs(): string[] {
    return this.program.args;
  }

  public getHelp() {
    this.program.outputHelp();
  }
}

function collectStrings(value: string, previous: OptionalStrings) {
  if (value) {
    if (typeof previous === "boolean") {
      previous = [];
    }
    previous.push(value);
  } else {
    previous = true;
  }
  return previous;
}

export type OptionalStrings = string[] | boolean;
export type OptionalString = string | boolean;
export type Options = Partial<{
  build: OptionalStrings;
  down: OptionalStrings;
  up: OptionalStrings;
  restart: OptionalStrings;
  reload: OptionalStrings;
  init: OptionalString;
  list: OptionalString;
  ps: boolean;
  template: string;
  ngrok: boolean;
  generate: boolean;
}>;
