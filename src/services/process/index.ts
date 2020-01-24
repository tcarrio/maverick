import { Service } from "typedi";
import { Logger } from "../logger";
import { spawn, exec } from ".";
import { SpawnOptions, spawnSync, SpawnSyncOptions } from "child_process";

@Service()
export class Runner {
  private readonly spawnOpts = { windowsHide: true };
  public constructor(private logger: Logger) {}

  public async spawn(
    command: string,
    args: string[] = [],
    opts: SpawnOptions = {}
  ) {
    const dirStr = opts.cwd ? ` in ${opts.cwd}` : "";
    this.logger.trace(`Spawning${dirStr}:`, command, ...args);
    await spawn(command, args, { ...opts, ...this.spawnOpts }).catch(err =>
      this.handleError(err)
    );
  }

  public spawnSync(
    command: string,
    args: string[] = [],
    opts: SpawnSyncOptions = {}
  ) {
    const dirStr = opts.cwd ? ` in ${opts.cwd}` : "";
    this.logger.trace(`Spawning${dirStr}:`, command, ...args);
    spawnSync(command, args, { ...opts, ...this.spawnOpts });
  }

  public async exec(command: string): Promise<ProcessInfo> {
    this.logger.trace("Executing:", command);
    const proc = await exec(command).catch(err => this.handleError(err));
    if (typeof proc !== "number") {
      return {
        stdout: proc.stdout,
        stderr: proc.stderr,
        status: 0
      };
    }

    return {
      stdout: "",
      stderr: "",
      status: proc
    };
  }

  public async execLog(command: string): Promise<ProcessInfo> {
    return this.exec(command).then(proc => {
      this.logger.info(proc.stdout);
      this.logger.error(proc.stderr);
      return proc;
    });
  }

  private handleError(err: Error): number {
    this.logger.error("Error encountered in runner:", err.message);
    return 1;
  }
}

export interface ProcessInfo {
  stdout: string;
  stderr: string;
  status: number;
}

export { spawn } from "./spawn";
export { exec } from "./exec";
export * from "./types";
