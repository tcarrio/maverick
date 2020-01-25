import fs from "fs";
import path from "path";
import { Service } from "typedi";
import { Config } from "../config";
import { InvalidArgumentsError } from "../util/errors";

@Service()
export class FlightControlService {
  public constructor(private config: Config) {}

  public ngrok(...args: string[]) {
    if (args.length !== 2) {
      throw new InvalidArgumentsError();
    }

    fs.writeFileSync(
      path.join(this.config.projectRoot, ".maverick"),
      `NGROK_SUBDOMAIN=${args[0]}
NGROK_AUTH=${args[1]}`
    );
  }
}
