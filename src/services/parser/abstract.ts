import { Service } from "typedi";
import { ComputedProjectInfo } from "../../types";

@Service()
export abstract class AbstractProjectParser {
  public constructor() {}

  public abstract async parse(): Promise<ComputedProjectInfo>;
}
