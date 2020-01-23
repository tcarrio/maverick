export class MaverickError extends Error {
  public constructor(message?: string) {
    super(message);
    Object.setPrototypeOf(this, MaverickError.prototype);
  }
}

export class UnsupportedPlatformError extends MaverickError {}
export class ProjectNotFoundError extends MaverickError {}
export class CommandFailedError extends MaverickError {}
export class MoonrakerExistsError extends MaverickError {}
export class ReadComposeError extends MaverickError {}
export class InvalidConfigFileError extends MaverickError {}
export class ConfigFileNotFoundError extends MaverickError {}
export class InvalidArgumentsError extends MaverickError {}
