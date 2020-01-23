import { Logger } from "./logger";
import { Container } from "typedi";

type LogLevel = "trace" | "debug" | "info" | "warn" | "error";

export function Log(): MethodDecorator;
export function Log(level: LogLevel): MethodDecorator;
export function Log(
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
): void;
export function Log(...args: any[]): void | MethodDecorator {
  if (args.length === 1) {
    return (t: object, p: string | symbol, d: PropertyDescriptor) => {
      const level = args[0];
      if (args) annotate(t, p, d, level);
    };
  }

  if (args.length === 3) {
    const target = args[0];
    const propertyName = args[1];
    const propertyDescriptor = args[2];

    return annotate(target, propertyName, propertyDescriptor);
  }

  return annotate;
}

function annotate<T>(
  target: object,
  propertyKey: string | symbol,
  descriptor: PropertyDescriptor,
  level: LogLevel = "trace",
) {
  const originalMethod = descriptor.value;
  descriptor.value = async function(...args: any[]) {
    const logger = Container.get(Logger);
    logger[level](
      `${target.constructor.name}:${propertyKey.toString()}:${JSON.stringify(
        args,
      )}`,
    );
    return originalMethod.apply(this, args);
  };
}
