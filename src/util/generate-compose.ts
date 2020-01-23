import Container from "typedi";
import { Generator } from "../services/generator";

/**
 * Will dictate that the Docker Compose configuration be generated prior to
 * running tasks in the function
 */
export function GenerateDockerCompose(): MethodDecorator {
  return function(
    _target: Record<string, any>,
    _key: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const generator = Container.get(Generator);
    const originalMethod = descriptor.value;
    descriptor.value = async function(...args: any[]) {
      await generator.generate(false);
      await originalMethod.apply(this, args);
      return generator.generate(true);
    };
  };
}
