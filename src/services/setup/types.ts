type Command = string;
type PlatformCommand = Command | Error;
export interface PlatformCommands {
  aix: PlatformCommand;
  android: PlatformCommand;
  darwin: PlatformCommand;
  freebsd: PlatformCommand;
  linux: PlatformCommand;
  openbsd: PlatformCommand;
  sunos: PlatformCommand;
  win32: PlatformCommand;
  cygwin: PlatformCommand;
}

export interface SetupInfo {
  projectRoot: string;
  moonrakerURL: string;
}