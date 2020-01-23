import { UnsupportedPlatformError } from "../../util/errors";
import { linuxSetupCommand } from "./platforms/linux";
import { darwinSetupCommand } from "./platforms/darwin";
import { win32SetupCommand } from "./platforms/win32";
import { SetupInfo } from "./types";

export const setupCommands = (info: SetupInfo) => ({
  // Supported platforms
  linux: linuxSetupCommand(info),
  darwin: darwinSetupCommand(info),
  win32: win32SetupCommand(info),

  // Unsupported platforms
  aix: new UnsupportedPlatformError(),
  android: new UnsupportedPlatformError(),
  freebsd: new UnsupportedPlatformError(),
  openbsd: new UnsupportedPlatformError(),
  sunos: new UnsupportedPlatformError(),
  cygwin: new UnsupportedPlatformError(),
});


