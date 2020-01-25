import { OptionalStrings } from "./types";
import { AbstractCLI } from "./abstract";
import fs from "fs";
import path from "path";

export function collectStrings(value: string, previous: OptionalStrings) {
  if (value) {
    if (typeof previous === "boolean") {
      previous = [];
    }
    previous.push(value);
  } else {
    previous = true;
  }
  return previous;
}

export function parseString(input: string | true): [string] | [] {
  const output: [string] | [] = typeof input === "string" ? [input] : [];
  return output;
}

export async function runCLI<T extends AbstractCLI>(cli: T) {
  try {
    await cli.run();
    await cli.complete;
    process.exit(0);
  } catch (err) {
    startupError(err);
  }
}

function startupError(err: Error) {
  console.error("Failed to start up maverick:", err.name);
  console.error(err);
  process.exit(1);
}

export function pathOf(name: string): string | undefined {
  const PATH = process.env.PATH;
  const paths = PATH ? PATH.split(":") : [];

  for (const p of paths) {
    const testPath = path.join(p, name);
    if (fs.existsSync(testPath)) {
      return testPath;
    }
  }

  return;
}
