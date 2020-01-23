import { Service } from "typedi";
import { Config } from "../config";
import { Runner } from "./process";
import { Logger } from "./logger";

import fs from "fs";
import path from "path";
import util from "util";

const readAsync = util.promisify(fs.readFile);
const DEFAULT_TSCONFIG = { out: "./dist" };

@Service()
export class PackageService {
  private _packages: PackageMap = {};

  public constructor(
    private config: Config,
    private runner: Runner,
    private logger: Logger,
  ) {}

  public async populate() {
    await this.getPackages()
      .then(async packages =>
        Promise.all(
          packages.map(async pkg => ({
            name: pkg.name,
            dependencies: [],
            workdir: (await this.getWorkdir(pkg.location)) || "/app",
            network: this.config.projectName,
            tsconfig:
              (await this.getTSConfig(pkg.location)) || DEFAULT_TSCONFIG,
            location: this.relativeLocation(pkg.location),
          })),
        ),
      )
      .then(packages => {
        packages.forEach(pkg => (this._packages[pkg.name] = pkg));
      })
      .then(async () => {
        const p = this._packages;
        return Promise.all(
          Object.keys(p).map(async pkgName => {
            const dependencies = await this.getPackageDependencies(pkgName);
            p[pkgName].dependencies = dependencies.map(d => p[d]);
          }),
        );
      })
      .catch((err: Error) => {
        this.logger.error("Failed to populate package info", err.message);
      });
  }

  public get packages() {
    return this._packages;
  }

  public set packages(packages: PackageMap) {
    return;
  }

  public async getPackages(): Promise<LernaPackageInfo[]> {
    const cmd = await this.runner.exec("lerna list --json");
    return JSON.parse(cmd.stdout);
  }

  public async getPackageDependencies(name: string): Promise<string[]> {
    const cmd = await this.runner.exec(
      `lerna list --scope ${name} --include-dependencies`,
    );
    return cmd.stdout.split("\n").filter(n => n !== name && n !== "");
  }

  // TODO: Parse Dockerfile more precisely
  public async getWorkdir(location: string): Promise<string | null> {
    return readAsync(path.join(location, "Dockerfile"), "utf-8")
      .then(s => {
        const lines = s
          .split("\n")
          .filter(l => l.indexOf("WORKDIR") > -1)
          .map(l => l.split("=")[1]);
        if (lines.length > 0) {
          return lines[lines.length - 1];
        }
        return null;
      })
      .catch(() => null);
  }

  // TODO: Parse TSConfig more precisely
  public async getTSConfig(location: string): Promise<TSConfigOptions | null> {
    return readAsync(path.join(location, "Dockerfile"), "utf-8")
      .then(s => {
        const c = JSON.parse(s);
        return c.compilerOptions && c.compilerOptions.outDir
          ? {
              out: c.compilerOptions.outDir,
            }
          : null;
      })
      .catch(() => null);
  }

  public async getPackageInfo(name: string) {
    const cmd = await this.runner.exec(`lerna list --json --scope ${name}`);
    return JSON.parse(cmd.stdout);
  }

  private relativeLocation(location: string): string {
    return location.replace(`${this.config.projectRoot}/`, "");
  }
}

export interface LernaPackageInfo {
  name: string;
  version: string;
  private: boolean;
  location: string;
}

export interface PackageMap {
  [name: string]: PackageInfo;
}

export interface PackageInfo {
  dependencies: PackageInfo[];
  location: string;
  name: string;
  network: string;
  workdir: string;
  tsconfig: TSConfigOptions;
}

export interface TSConfigOptions {
  out: string;
}
