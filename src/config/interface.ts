import { MaverickRootConfig, SetupConfiguration } from "../types";

export interface IConfig {
  valid: boolean;
  cwd: string;
  projectName: string;
  compose: string;
  config: MaverickRootConfig;
  projectRoot: string;
  setup: SetupConfiguration;
}
