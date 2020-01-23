export type ProcessData = ProcessMessage | ProcessExit;

export interface ProcessMessage {
  type: ProcessDataType.Message;
  payload: ProcessMessagePayload;
}
export interface ProcessMessagePayload {
  stdout: string;
  stderr: string;
}

export interface ProcessExit {
  type: ProcessDataType.Exit;
  payload: ProcessExitPayload;
}
export interface ProcessExitPayload {
  code: number;
}

export enum ProcessDataType {
  Message,
  Exit,
}
