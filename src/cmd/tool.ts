#!/usr/bin/env node

import "reflect-metadata";
import { Container } from "typedi";
import { ToolCLI } from "../cli/tool";
import { runCLI } from "../cli/util";

runCLI(Container.get(ToolCLI));
