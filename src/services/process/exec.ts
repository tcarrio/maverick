import { exec as cpExec } from "child_process";
import { ProcessMessagePayload } from "./types";

export async function exec(command: string): Promise<ProcessMessagePayload> {
  return new Promise((res, rej) => {
    cpExec(command, (err, stdout, stderr) => {
      if (!err) {
        return res({ stdout, stderr });
      }
      return rej(err);
    });
  });
}
