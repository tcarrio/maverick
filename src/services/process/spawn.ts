import { spawn as cpSpawn, SpawnOptions } from "child_process";

export function spawn(
  command: string,
  args: string[] = [],
  opts: SpawnOptions = {}
): Promise<number> {
  return new Promise((res, rej) => {
    if (process.stdin.setRawMode === undefined) {
      return res(999);
    }
    process.stdin.setRawMode(false);
    const proc = cpSpawn(command, args, { ...opts, stdio: [0, 1, 2] });
    proc.on("exit", (code: number | null) => {
      process.stdin.setRawMode!(true);
      res(code || 0);
    });
    proc.on("error", err => {
      process.stdin.setRawMode!(true);
      rej(err);
    });
  });
}
