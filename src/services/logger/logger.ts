import "reflect-metadata";
import bunyan from "bunyan";
import Format from "bunyan-format";
import { RequestHandler } from "express-serve-static-core";
import morgan from "morgan";
import { Service } from "typedi";

const DEFAULT_LOG_LEVEL = "info";

@Service()
export class Logger extends bunyan {
  public constructor() {
    super({
      level: getLevel(),
      name: "router",
      serializers: {
        err: bunyan.stdSerializers.err,
      },
      stream:
        process.env.NODE_ENV !== "production"
          ? new Format({ outputMode: "short" })
          : new Format({ outputMode: "bunyan", levelInString: true }),
    });
  }

  public async swallow(promise: Catchable): Promise<void> {
    await promise.catch(err => this.error({ err }));
  }

  /**
   * Express middleware for logger. This is for debugging purposes only!
   *
   * @param message
   */
  public middleware(message: string) {
    return (req: unknown, res: unknown, next: Function) => {
      if (this.level() !== bunyan.TRACE) {
        next();
      }
      const stack = new Error().stack;
      const stackLine = stack && stack.split("\n")[4];
      const line = (stackLine && stackLine.trim()) || "at unknown line";
      this.trace(`${message} ${line}`);
      next();
    };
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

  /**
   * Hook into morgan so we can log via bunyan
   */
  public morgan(): RequestHandler {
    return morgan((tokens, req, res): any => {
      if ((req as any).skipLogging) return;

      const log = this.getMorganLog(tokens, req, res);

      this.info(log, log.url);
    });
  }

  private getMorganLog(tokens: morgan.TokenIndexer, req: any, res: any) {
    const log: MorganLog = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      ip_address: tokens["remote-addr"](req, res),
      method: tokens.method(req, res),
      url: tokens.url(req, res),
      status: tokens.status(req, res),
      // eslint-disable-next-line @typescript-eslint/camelcase
      response_time: tokens["response-time"](req, res),
    };
    // Add additional context if available
    // eslint-disable-next-line @typescript-eslint/camelcase
    if (req.davisRequestTag) {
      log.req_id = req.davisRequestTag;
    }
    if (req.user) {
      log.userId = req.user.id;
      log.email = req.user.email;
    }
    if (req.sessionID) log.sessionID = req.sessionID;
    return log;
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
          source: message.source,
        });
      } else if (message instanceof Error) {
        Object.assign(obj, {
          err: message,
        });
      } else {
        Object.assign(obj, message);
      }
    });
    return [obj, strings];
  }
}

interface MorganLog {
  ip_address: string;
  method: string;
  url: string;
  status: string;
  response_time: string;
  req_id?: string;
  userId?: string;
  email?: string;
  sessionID?: string;
  [key: string]: string | undefined;
}

interface Catchable {
  catch(handler: (err: Error) => any): this;
}

function getLevel(): bunyan.LogLevelString {
  const level = process.env.LOG_LEVEL || process.env.DAVIS_LOG_LEVEL;

  const levels = new Set(["trace", "debug", "info", "warn", "error", "fatal"]);

  if (level && levels.has(level)) {
    return level as bunyan.LogLevelString;
  }

  return DEFAULT_LOG_LEVEL;
}
