import { Service } from "typedi";
import { Config } from "../../config";
import {
  ComputedPackageInfo,
  ComputedProjectInfo,
  PackageLanguage,
  ProjectLanguage,
  PackageType,
  PackageJsonDependencies,
  PackageDependencies
} from "../../types";
import { Runner } from "../process";
import { AbstractProjectParser } from "./abstract";
import path from "path";
import { convertToSafe } from "../../util/safe-name";
import { readFile } from "../../util/read-file";
import { exists } from "../../util/exists";
import { calculateDependencyHash } from "./shared";

@Service()
export class LernaProjectParser extends AbstractProjectParser {
  private _parsed: ComputedProjectInfo | null = null;

  public constructor(private config: Config, private runner: Runner) {
    super();
  }

  /**
   * This implementation of the Lerna project parser is a singleton processor,
   * which will return the initial computed value for the project info regardless
   * of how many times it is called
   */
  public async parse(): Promise<ComputedProjectInfo> {
    if (!this._parsed) {
      const pwd = this.config.projectRoot;

      const packages = new Map<string, ComputedPackageInfo>();

      const lernaPackagesOutput = await this.runner.exec(
        "lerna list -a --json"
      );

      if (lernaPackagesOutput.status !== 0) {
        console.error(lernaPackagesOutput.stderr);
        throw new Error("Error encountered running lerna list");
      }

      const lernaPackageInfo = JSON.parse(lernaPackagesOutput.stdout);

      await Promise.all(
        lernaPackageInfo.map(async (p: LernaPackageInfo) => {
          if (packages.has(p.name)) {
            throw new Error("FATAL: A duplicate package name was found");
          }

          const dependencyInfo = await this.getDependencies(p);

          const packageInfo = {
            ...dependencyInfo,
            packageName: p.name,
            safePackageName: this.convertToSafe(p.name),
            relativePath: this.getRelativePath(p),
            language: await this.getPackageLanguage(p),
            type: await this.getPackageType(p),
            dotenv: await this.hasDotEnv(p)
          };

          packages.set(p.name, packageInfo);
        })
      );

      const language = this.findProjectLanguage(packages);

      const project: ComputedProjectInfo = {
        pwd,
        packages,
        language
      };

      this._parsed = project;
    }

    return this._parsed;
  }

  /**
   * Returns a safe package name for use in the docker-compose.yml
   *
   * @param name: the name of the package
   */
  private convertToSafe(name: string): string {
    return convertToSafe(name);
  }

  /**
   * Determines the regular path by removing the project root from the path
   *
   * @param p: LernaPackageInfo
   */
  private getRelativePath(p: LernaPackageInfo): string {
    return p.location.replace(this.config.projectRoot, "").replace(/^\//, "");
  }

  /**
   * Determining the language of a package is done by checking for the existence
   * of a `tsconfig.json` file. If it exists, the package is considered a
   * `typescript` package.
   *
   * @param p: LernaPackageInfo
   */
  private async getPackageLanguage(
    p: LernaPackageInfo
  ): Promise<PackageLanguage> {
    const tsconfigFound = await exists(path.join(p.location, "tsconfig.json"));
    return tsconfigFound ? "typescript" : "javascript";
  }

  /**
   * Dependencies are loaded using `lerna` to list all dependencies specific to
   * the package and cross-referencing the `package.json` file
   *
   * @param p: LernaPackageInfo
   */
  private async getDependencies(
    p: LernaPackageInfo
  ): Promise<Pick<ComputedPackageInfo, "dependencies" | "dependencyHash">> {
    const [lernaDependencies, packageDependencies] = await Promise.all([
      this.collectLernaDependencies(p),
      this.collectPackageDependencies(p)
    ]);

    const dependencies = this.calculatePackageDependencies(
      lernaDependencies,
      packageDependencies
    );
    const dependencyHash = calculateDependencyHash(packageDependencies);

    return {
      dependencies,
      dependencyHash
    };
  }

  private async collectLernaDependencies(
    p: LernaPackageInfo
  ): Promise<string[]> {
    const proc = await this.runner.exec(
      `lerna list --include-filtered-dependencies --scope=${p.name}`
    );
    return proc.stdout.split("\n").filter(x => !!x);
  }

  private async collectPackageDependencies(
    p: LernaPackageInfo
  ): Promise<PackageJsonDependencies> {
    const buffer = await readFile(path.join(p.location, "package.json"));
    const packageManifest = JSON.parse(buffer.toString());
    const devDependencies = packageManifest.devDependencies || [];
    const dependencies = packageManifest.dependencies || [];
    return { dependencies, devDependencies };
  }

  private calculatePackageDependencies(
    lernaDeps: string[],
    packageDeps: PackageJsonDependencies
  ): PackageDependencies {
    const packageDependencySet = new Set([
      ...Object.keys(packageDeps.devDependencies),
      ...Object.keys(packageDeps.dependencies)
    ]);

    const direct = lernaDeps.filter(x => packageDependencySet.has(x));
    const indirect = lernaDeps.filter(x => !packageDependencySet.has(x));

    return { direct, indirect };
  }

  private async getPackageType(p: LernaPackageInfo): Promise<PackageType> {
    const buffer = await readFile(path.join(p.location, "package.json"));
    const packageManifest = JSON.parse(buffer.toString());
    const isPackage =
      Object.keys(packageManifest.scripts).indexOf("maverick:watch") >= 0;
    const isService =
      Object.keys(packageManifest.scripts).indexOf("maverick:start") >= 0;
    return isService ? "service" : isPackage ? "package" : "unknown";
  }

  private findProjectLanguage(
    packages: Map<string, ComputedPackageInfo>
  ): ProjectLanguage {
    return (
      Array.from(packages.keys()).reduce(
        (type: ProjectLanguage | undefined, name: string) => {
          if (type === "unknown") {
            return type;
          }

          if (type === undefined) {
            return packages.get(name)!.language;
          }

          if (type !== packages.get(name)!.language) {
            return "unknown";
          }

          return type;
        },
        undefined
      ) || "unknown"
    );
  }

  private async hasDotEnv(p: LernaPackageInfo) {
    return await exists(path.join(p.location, ".env"));
  }
}

interface LernaPackageInfo {
  name: string;
  version: string;
  private: true;
  location: string;
}
