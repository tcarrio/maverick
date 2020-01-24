import { Service } from "typedi";
import { ComputedProjectInfo } from "../../types";
import { Config } from "../../config";

@Service()
export class VoidProjectParser {
  public constructor(private config: Config) {}

  public async parse(): Promise<ComputedProjectInfo> {
    return {
      pwd: this.config.projectRoot,
      language: "unknown",
      packages: new Map()
    };
  }
}
