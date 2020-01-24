import "reflect-metadata";
import bunyan from "bunyan";
import Format from "bunyan-format";
import { Service } from "typedi";

const DEFAULT_LOG_LEVEL = "info";

@Service()
export class Logger extends bunyan {
  public constructor() {
    super({
      level: getLevel(),
      name: "maverick",
      serializers: {
        err: bunyan.stdSerializers.err
      },
      stream: new Format({ outputMode: "short" })
    });
  }

  public async swallow(promise: Catchable): Promise<void> {
    await promise.catch(err => this.error({ err }));
  }

  public trace(): boolean;
  public trace(...messages: any[]): void;
  public trace(...messages: any[]): boolean | void {
    if (messages) {
      const [obj, strings] = this.formatLogMessage(...messages);
      return super.trace(obj, ...strings);
    }
    return super.trace();
  }

  public debug(): boolean;
  public debug(...messages: any[]): void;
  public debug(...messages: any[]): boolean | void {
    if (messages) {
      const [obj, strings] = this.formatLogMessage(...messages);
      return super.debug(obj, ...strings);
    }
    return super.debug();
  }

  public info(): boolean;
  public info(...messages: any[]): void;
  public info(...messages: any[]): boolean | void {
    if (messages) {
      const [obj, strings] = this.formatLogMessage(...messages);
      return super.info(obj, ...strings);
    }
    return super.info();
  }

  public warn(): boolean;
  public warn(...messages: any[]): void;
  public warn(...messages: any[]): boolean | void {
    if (messages) {
      const [obj, strings] = this.formatLogMessage(...messages);
      return super.warn(obj, ...strings);
    }
    return super.warn();
  }

  public error(): boolean;
  public error(...messages: any[]): void;
  public error(...messages: any[]): boolean | void {
    if (messages) {
      const [obj, strings] = this.formatLogMessage(...messages);
      return super.error(obj, ...strings);
    }
    return super.error();
  }

  private formatLogMessage(...messages: any[]): [any, string[]] {
    const obj = {};
    const strings: string[] = [];
    messages.forEach((message: any) => {
      if (typeof message === "string") {
        strings.push(message);
        return;
      }
      // Checks if we're dealing with a request object
      if (message.user && message.tenant && message.source) {
        Object.assign(obj, {
          user: message.user,
          tenant: message.tenant,
          source: message.source
        });
      } else if (message instanceof Error) {
        Object.assign(obj, {
          err: message
        });
      } else {
        Object.assign(obj, message);
      }
    });
    return [obj, strings];
  }
}

interface Catchable {
  catch(handler: (err: Error) => any): this;
}

function getLevel(): bunyan.LogLevelString {
  const level = process.env.LOG_LEVEL;

  const levels = new Set(["trace", "debug", "info", "warn", "error", "fatal"]);

  if (level && levels.has(level)) {
    return level as bunyan.LogLevelString;
  }

  return DEFAULT_LOG_LEVEL;
}
