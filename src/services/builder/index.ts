import { Logger } from "../logger";
import path from "path";
import Container, { Inject } from "typedi";
import {
  DockerComposeDefinition,
  DockerComposeService,
} from "../../@types/docker-compose";
import { Config } from "../../config";
import {
  BuilderConfiguration,
  CompleteMaverickDeclaration,
  ComputedPackageInfo,
  ComputedProjectInfo,
  DataSourceConfiguration,
  MaverickConfigDefaults,
  MaverickDeclaration,
  MaverickServiceConfig,
  Indexable,
} from "../../types";
import { convertToSafe } from "../../util/safe-name";
import { union } from "../../util/union";
import {
  AbstractProjectParser,
  LernaProjectParser,
  NxProjectParser,
  VoidProjectParser,
} from "../parser";
import { builtins } from "./infrastructure";
import { Base64 } from "../../util/base64";

export class ComposeBuilder {
  private _parser: AbstractProjectParser | null = null;
  private functionalReplacementRegex = /(\{\{ ([a-z_]+)\(([a-zA-Z0-9@_\-/]+)\) \}\})/;
  // /(\{\{ (image)\((.+)\) \}\})/;

  private definition: DockerComposeDefinition | null = null;

  private readonly categoricalServiceLists: CategoricalServiceLists = {};

  public constructor(
    @Inject(() => Config) private config: Config,
    private logger: Logger,
  ) {}

  public async getDefinition(): Promise<DockerComposeDefinition> {
    if (!this.definition) {
      this.definition = await this.build();
    }

    return this.definition;
  }

  private async build(): Promise<DockerComposeDefinition> {
    const project = this.projectConfig;
    this.logger.trace({ location: "MaverickConfigBuilder", project });
    const internal = this.internalConfig;
    this.logger.trace({ location: "MaverickConfigBuilder", internal });

    const defaults: MaverickConfigDefaults = this.buildDefaults();

    const overrides = await this.getComposeServices("overrides" as any, {
      project,
      internal,
      defaults,
    });

    const cfg = { project, internal, defaults, overrides };

    const cBuiltins = this.getBuiltinInfrastructure(defaults);
    this.logger.trace("builtins contains", cBuiltins);

    const cImages = await this.getComposeServices("images", cfg);
    this.logger.trace("images contains", cImages);

    const cInfrastructure = await this.getComposeServices(
      "infrastructure",
      cfg,
    );
    this.logger.trace("infrastructure contains", cInfrastructure);

    const cBatch = await this.getComposeServices("batch", cfg);
    this.logger.trace("batch contains", cBatch);

    const cPackages = await this.getComposeServices("packages", cfg);
    this.logger.trace("packages contains", cPackages);

    const cServices = await this.getComposeServices("services", cfg);
    this.logger.trace("services contains", cServices);

    const maverickDefinitions = {
      ...cImages,
      ...cBuiltins,
      ...cInfrastructure,
      ...cBatch,
      ...cPackages,
      ...cServices,
    };

    const { dynamicPackages, dynamicServices } = await this.getDynamicEntries(
      cfg,
      Object.keys(maverickDefinitions),
    );

    const unprocessedServices = {
      ...maverickDefinitions,
      ...dynamicPackages,
      ...dynamicServices,
    };

    const services = this.processServicesTemplate(
      unprocessedServices,
      unprocessedServices,
    );

    this.categoricalServiceLists.infrastructure = [
      ...Object.keys(cBuiltins),
      ...Object.keys(cInfrastructure),
    ];
    this.categoricalServiceLists.images = Object.keys(cImages);
    this.categoricalServiceLists.batch = Object.keys(cBatch);
    this.categoricalServiceLists.packages = Object.keys(dynamicPackages);
    this.categoricalServiceLists.services = Object.keys(dynamicServices);

    return {
      version: "3.7",
      services,
      networks: this.buildNetworks(),
      volumes: this.buildVolumes({
        ...cPackages,
        ...cServices,
        ...cBuiltins,
        ...dynamicPackages,
        ...dynamicServices,
      }),
    };
  }

  public get categories(): CategoricalServiceLists {
    return this.categoricalServiceLists;
  }

  public set categories(_: CategoricalServiceLists) {
    return;
  }

  private get parser() {
    if (!this._parser) {
      switch (this.projectConfig.projectType) {
        case "lerna":
          this._parser = Container.get(LernaProjectParser);
          break;
        case "nx":
          this._parser = Container.get(NxProjectParser);
          break;
        default:
          this._parser = Container.get(VoidProjectParser);
      }
    }

    return this._parser;
  }

  private buildDefaults(): MaverickConfigDefaults {
    const emptyDefaults: MaverickConfigDefaults = { all: {} };
    return union(
      emptyDefaults,
      this.internalConfig.defaults || {},
      this.projectConfig.defaults || {},
    ) as MaverickConfigDefaults;
  }

  private async getDynamicEntries(
    configuration: BuilderConfiguration,
    userDefinedPackages: string[],
  ): Promise<DynamicProjectEntries> {
    const parsed = await this.parser.parse();

    const packagesFromParser: string[] = Array.from(parsed.packages.keys());
    this.logger.trace("Packages from parser:", packagesFromParser);

    const existingSet = new Set(userDefinedPackages);
    this.logger.trace("Packages defined by user:", userDefinedPackages);

    const remainingPackages: {
      [name: string]: ComputedPackageInfo;
    } = packagesFromParser
      .filter(x => !existingSet.has(x))
      .reduce(
        (map, name) => ({
          ...map,
          [name]: parsed.packages.get(name),
        }),
        {},
      );

    this.logger.trace("Built remainingPackages:", remainingPackages);

    const packages: ComputedPackageInfo[] = Object.keys(
      remainingPackages,
    ).reduce(
      (list, name) =>
        remainingPackages[name].type === "package"
          ? [...list, remainingPackages[name]]
          : list,
      [] as ComputedPackageInfo[],
    );
    const services: ComputedPackageInfo[] = Object.keys(
      remainingPackages,
    ).reduce(
      (list, name) =>
        remainingPackages[name].type === "service"
          ? [...list, remainingPackages[name]]
          : list,
      [] as ComputedPackageInfo[],
    );

    this.logger.trace("packages");
    this.logger.trace(packages);
    this.logger.trace("services");
    this.logger.trace(services);

    const dynamicPackages: CompleteMaverickDeclaration = packages.reduce(
      (map, pkg) => ({
        ...map,
        [pkg.safePackageName]: this.buildComposeFromPackage(
          pkg,
          parsed,
          configuration,
          "packages",
        ),
      }),
      {},
    );
    const dynamicServices: CompleteMaverickDeclaration = services.reduce(
      (map, pkg) => ({
        ...map,
        [pkg.safePackageName]: this.buildComposeFromPackage(
          pkg,
          parsed,
          configuration,
          "services",
        ),
      }),
      {},
    );

    return {
      dynamicPackages,
      dynamicServices,
    };
  }

  private buildComposeFromPackage(
    p: ComputedPackageInfo,
    project: ComputedProjectInfo,
    cfg: BuilderConfiguration,
    type: keyof MaverickConfigDefaults,
  ): DockerComposeService {
    const name = p.safePackageName;
    const defaults: Partial<DockerComposeService> = {
      ...cfg.defaults.all,
      ...cfg.defaults[type],
    };
    const override = cfg.overrides && cfg.overrides[name];

    // Computed npm script to run for package/service
    const npmScript = type === "services" ? "maverick:start" : "maverick:watch";

    // Computed env_files to mount for container
    const globalEnv = this.config.projectConfig.dotenv;
    const packageEnv = p.dotenv;
    // eslint-disable-next-line @typescript-eslint/camelcase
    const env_file = [];
    if (globalEnv) {
      env_file.push(path.join(".env"));
    }
    if (packageEnv) {
      env_file.push(path.join(p.relativePath, ".env"));
    }

    // Computed `depends_on` for service
    // eslint-disable-next-line @typescript-eslint/camelcase
    const depends_on: string[] = [];

    const allDependencies = [
      ...p.dependencies.direct,
      ...p.dependencies.indirect,
    ];

    for (const dependencyName of allDependencies) {
      if (dependencyName !== p.packageName) {
        depends_on.push(convertToSafe(dependencyName));
      }
    }

    // Computed `volumes` to mount for package/service
    const volumes: string[] = [];
    // volumes.push(...this.volumeMountOf(p.packageName, cfg, project, true));
    for (const dependencyName of allDependencies) {
      const mountDefinition = this.volumeMountOf(
        dependencyName,
        cfg,
        project,
        p.packageName === dependencyName,
      );
      if (mountDefinition) {
        volumes.push(...mountDefinition);
      }
    }

    // Computed networks for compose service
    const networks = Object.keys(this.buildNetworks());
    if (override) {
      networks.push(...(override.networks || []));
    }

    // Computed image for compose service
    const image =
      (override && override.image) ||
      defaults.image ||
      this.defaultPackageImage(p);

    // Computed build for compose service
    const build = (override && override.build) || defaults.build;

    // Full Compose service definition
    const definition = {
      ...defaults,
      command: ["npm", "--prefix", p.relativePath, "run", npmScript],
      env_file,
      volumes,
      depends_on,
      networks,
      ...((cfg.overrides && cfg.overrides[name]) || {}),
    };

    if (image) {
      definition.image = this.processPackageTemplate(p, project, image);
    }

    if (build) {
      definition.build = this.processPackageTemplate(p, project, build);
    }

    return definition;
  }

  private volumeMountOf(
    dependencyName: string,
    cfg: BuilderConfiguration,
    project: ComputedProjectInfo,
    self?: boolean,
  ): string[] {
    const pkgInfo = project.packages.get(dependencyName);
    const mounts: string[] = [];
    if (!pkgInfo) {
      return mounts;
    }

    // The package mount for the package itself
    if (self) {
      // map the local `src` and `package.json` into the container
      const filePaths = ["src", "package.json"];
      mounts.push(
        ...filePaths.map(p => this.generateSelfFileMount(pkgInfo, p)),
      );

      // Mount transpiled artifacts to the packages volume
      if (pkgInfo.language === "typescript" && pkgInfo.type === "package") {
        const sourcePath = `${pkgInfo.safePackageName}-data`;
        const targetPath = `${path.join(
          this.config.projectConfig.workspaceDir || "/opt",
          pkgInfo.relativePath,
          "dist",
        )}`;

        mounts.push(this.buildVolumeMapEntry(sourcePath, targetPath));
      }

      return mounts;
    }

    // The package mount for the packages dependency
    if (pkgInfo.language === "javascript") {
      const sourcePath = `${path.join(
        this.config.projectRoot,
        pkgInfo.relativePath,
        "src",
      )}`;
      const targetPath = `${path.join(
        this.config.projectConfig.workspaceDir || "/opt",
        pkgInfo.relativePath,
        "src",
      )}`;
      mounts.push(this.buildVolumeMapEntry(sourcePath, targetPath));
    }
    if (pkgInfo.language === "typescript") {
      const sourcePath = `${pkgInfo.safePackageName}-data`;
      const targetPath = `${path.join(
        this.config.projectConfig.workspaceDir || "/opt",
        pkgInfo.relativePath,
        "dist",
      )}`;
      mounts.push(this.buildVolumeMapEntry(sourcePath, targetPath));
    }

    return mounts;
  }

  private generateSelfFileMount(
    pkgInfo: ComputedPackageInfo,
    filePath: string,
  ): string {
    const sourcePath = `./${path.join(pkgInfo.relativePath, filePath)}`;
    const targetPath = path.join(
      this.config.projectConfig.workspaceDir ||
        this.config.internalConfig.workspaceDir ||
        "/opt",
      pkgInfo.relativePath,
      filePath,
    );

    return `${sourcePath}:${targetPath}`;
  }

  private async getComposeServices<T extends MaverickServiceConfig>(
    type: keyof MaverickServiceConfig,
    configuration: BuilderConfiguration<T>,
  ): Promise<CompleteMaverickDeclaration> {
    const services: CompleteMaverickDeclaration = {};

    const project = configuration.project[type] || {};
    const internal = configuration.internal[type] || {};
    const allDefaults = configuration.defaults.all || {};
    const typeDefaults = configuration.defaults[type] || {};
    const overrides = configuration.overrides || {};

    const parsed = await this.parser.parse();

    const serviceKeys = this.serviceKeysOf(project, internal);

    this.logger.trace(`Checking service keys: ${serviceKeys.join(", ")}`);

    for (const serviceName of serviceKeys) {
      this.logger.trace("Processing serviceName", serviceName);
      const pkg = parsed.packages.get(serviceName);

      let serviceKey = null;

      const serviceOverride =
        serviceName in overrides ? overrides[serviceName] : {};

      if (!pkg) {
        if (type === "packages" || type === "services") {
          this.logger.trace(
            "Skipping package that was not found in project",
            serviceName,
          );
          continue;
        }

        serviceKey = serviceName;
      } else {
        if (!pkg.safePackageName) {
          this.logger.trace("safePackageName not set for service", serviceName);
          continue;
        }

        serviceKey = pkg.safePackageName;
      }

      if (serviceKey in services) {
        throw new Error(
          "A duplicate name was found when transformed to URL safe strings",
        );
      }

      const service = union(
        internal[serviceName],
        project[serviceName],
        allDefaults,
        typeDefaults,
        serviceOverride,
      );

      this.logger.trace(
        `Built ${type} field (${serviceName}) with values`,
        service,
      );

      services[serviceKey] = service;
    }

    return services;
  }

  private serviceKeysOf(
    project: MaverickDeclaration,
    internal: MaverickDeclaration,
  ) {
    return [...Object.keys(project || {}), ...Object.keys(internal || {})];
  }

  private buildNetworks(): { [name: string]: object } {
    const internalNetworks = this.internalConfig.networks || [];
    const projectNetworks = this.projectConfig.networks || [];
    return [...internalNetworks, ...projectNetworks].reduce(
      (map, name) => ({ ...map, [name]: {} }),
      {},
    );
  }

  private buildVolumes(
    packages: CompleteMaverickDeclaration,
  ): { [name: string]: {} } {
    return Object.keys(packages)
      .map(name => `${name}-data`)
      .reduce((map, name) => ({ ...map, [name]: {} }), {});
  }

  private processPackageTemplate(
    pkgInfo: ComputedPackageInfo,
    projInfo: ComputedProjectInfo,
    input?: any,
  ): any {
    if (input === undefined) {
      return input;
    }

    if (input instanceof Array) {
      return input.reduce(
        (list, value) => [
          ...list,
          this.processPackageTemplate(pkgInfo, projInfo, value),
        ],
        [],
      );
    }

    if (typeof input === "object") {
      return Object.keys(input).reduce(
        (map: Indexable, key: string | number) => ({
          ...map,
          [key]: this.processPackageTemplate(pkgInfo, projInfo, input[key]),
        }),
        {},
      );
    }

    const conversions: ConversionMap = {
      safePackageName: pkgInfo.safePackageName,
      packageName: pkgInfo.packageName,
      dependencyHash: Base64.fromInt(pkgInfo.dependencyHash),
    };

    // Include parameterized string replacements here
    return Object.keys(conversions).reduce(
      (output: string, key: string) =>
        output.replace(`{{ ${key} }}`, conversions[key as keyof ConversionMap]),
      input,
    );
  }

  private processServicesTemplate(
    svcMap: CompleteMaverickDeclaration,
    input?: any,
  ): any {
    if (input === undefined) {
      return input;
    }

    if (input instanceof Array) {
      return input.reduce(
        (list, value) => [...list, this.processServicesTemplate(svcMap, value)],
        [],
      );
    }

    if (typeof input === "object") {
      return Object.keys(input).reduce(
        (map: Indexable, key: string | number) => ({
          ...map,
          [key]: this.processServicesTemplate(svcMap, input[key]),
        }),
        {},
      );
    }

    let match = this.functionalReplacementRegex.exec(input);
    while (match && match.length === 4) {
      input = this.processTemplateFunction(input, match, svcMap);
      match = this.functionalReplacementRegex.exec(input);
    }

    return input;
  }

  private processTemplateFunction(
    template: string,
    match: RegExpExecArray,
    svcMap: CompleteMaverickDeclaration,
    levels = 0,
  ): DockerComposeService[keyof DockerComposeService] {
    if (levels >= Object.keys(svcMap).length) {
      throw new Error("We have exceeded the maximum template recursion depth!");
    }

    let replacement: DockerComposeService[keyof DockerComposeService] = "";
    const arg = match[3];
    const func = match[2];
    switch (func) {
      default:
        if (!isDockerComposeServiceKey(func)) {
          throw new Error(`Invalid key: ${func}`);
        }
        if (!svcMap[arg]) {
          throw new Error(`Failed to find ${func} for ${arg}`);
        }

        let value = svcMap[arg][func];
        if (!value) {
          throw new Error(
            `Referenced a(n) ${func} field that does not exist! Received: ${arg}`,
          );
        }

        if (typeof value !== "string") {
          replacement = value;
          break;
        }

        const parameterMatch = this.functionalReplacementRegex.exec(value);
        if (parameterMatch && parameterMatch.length === 4) {
          value = this.processTemplateFunction(
            value,
            parameterMatch,
            svcMap,
            levels + 1,
          );
          // @ts-ignore
          svcMap[arg][func] = value;
        }

        replacement = value;
    }

    if (typeof replacement !== "string") {
      return replacement;
    }

    return template.replace(match[0], replacement);
  }

  private defaultPackageImage(p: ComputedPackageInfo): string {
    return `${p.safePackageName}:${p.dependencyHash}`;
  }

  private buildVolumeMapEntry(sourcePath: string, targetPath: string) {
    return `${sourcePath}:${targetPath}`;
  }

  private getBuiltinInfrastructure(
    defaults: MaverickConfigDefaults,
  ): CompleteMaverickDeclaration {
    const builtinKeys: (keyof DataSourceConfiguration)[] = [
      "minio",
      "mysql",
      "ngrok",
      "redis",
    ];

    return builtinKeys.reduce(
      (declarations, key) => ({
        ...declarations,
        ...this.builtinAsDeclaration(key, defaults),
      }),
      {},
    );
  }

  private builtinAsDeclaration(
    name: keyof DataSourceConfiguration,
    defaults: MaverickConfigDefaults,
  ) {
    const service = builtins[name]!(this.config.projectConfig[name], defaults);
    return service ? { [name]: service } : {};
  }

  private get projectConfig() {
    return this.config.projectConfig;
  }

  private get internalConfig() {
    return this.config.internalConfig;
  }
}

interface ConversionMap {
  safePackageName: string;
  packageName: string;
  dependencyHash: string;
}

interface DynamicProjectEntries {
  dynamicPackages: CompleteMaverickDeclaration;
  dynamicServices: CompleteMaverickDeclaration;
}

const composeServiceKeys = new Set<keyof DockerComposeService>([
  "build",
  "image",
  "environment",
  "env_file",
  "networks",
  "ports",
  "volumes",
  "stdin_open",
  "tty",
  "command",
  "depends_on",
]);
function isDockerComposeServiceKey(
  input: string,
): input is keyof DockerComposeService {
  return composeServiceKeys.has(input as keyof DockerComposeService);
}

export type CategoricalServiceLists = {
  [key in keyof MaverickServiceConfig]: string[];
};
