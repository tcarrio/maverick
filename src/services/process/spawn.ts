import {
  ChildProcessWithoutNullStreams,
  spawn as cpSpawn,
  SpawnOptions,
} from "child_process";
import { fromEvent, Observable, ReplaySubject } from "rxjs";
import { ProcessData, ProcessDataType, ProcessMessagePayload } from "./types";

export function spawn(
  command: string,
  args: string[] = [],
  opts: SpawnOptions = {},
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

export function spawnObservable(command: string): Observable<ProcessData> {
  const $obs: ReplaySubject<ProcessData> = new ReplaySubject<ProcessData>();
  const child = cpSpawn(command);
  subscribeToEvents($obs, child);
  return $obs.asObservable();
}

function subscribeToEvents(
  $obs: ReplaySubject<ProcessData>,
  child: ChildProcessWithoutNullStreams,
) {
  fromEvent(child, "close").subscribe({
    complete: $obs.complete,
  });
  fromEvent(child, "disconnect").subscribe({
    complete: $obs.complete,
  });
  fromEvent(child, "error").subscribe({
    error: $obs.error,
  });
  fromEvent(child, "exit").subscribe({
    next: code => {
      $obs.next({
        type: ProcessDataType.Exit,
        payload: { code: code as number },
      });
      $obs.complete();
    },
  });
  fromEvent(child, "message").subscribe({
    next: state =>
      $obs.next({
        type: ProcessDataType.Message,
        payload: state as ProcessMessagePayload,
      }),
  });
  fromEvent(child, "data").subscribe({
    next: state => $obs.next(state as ProcessData),
    error: $obs.error,
    complete: $obs.complete,
  });
}
