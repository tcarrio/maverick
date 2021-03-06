#!/usr/bin/env node
import "reflect-metadata";
import { Container } from "typedi";
import { Maverick } from "./services/maverick";

/** plugin imports */
import { IConfig } from "./config/interface";
import { Logger } from "./services/logger";
import { Runner } from "./services/process";
import { checkForUpdate } from "./util/check-for-update";

async function main() {
  try {
    await Container.get(Maverick).run();
  } catch (err) {
    startupError(err);
  }
}

function startupError(err: Error) {
  console.error("Failed to start up maverick:", err.name);
  process.exit(1);
}

main();
checkForUpdate();

/** exports for plugins */
export { IConfig, Logger, Runner };
