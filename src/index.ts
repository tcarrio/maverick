#!/usr/bin/env node
import "reflect-metadata";
import { Container } from "typedi";
import { Maverick } from "./services/maverick";

try {
  Container.get(Maverick).run()
} catch (err) {
  startupError(err);
}

function startupError(err: Error) {
  console.error("Failed to start up maverick:", err.name);
  process.exit(1);
}
