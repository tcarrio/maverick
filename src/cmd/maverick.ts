#!/usr/bin/env node

import "reflect-metadata";
import { Container } from "typedi";
import { ProgramCLI } from "../cli/maverick";
import { runCLI } from "../cli/util";

runCLI(Container.get(ProgramCLI));
