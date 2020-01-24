import { DockerComposeService } from "./@types/docker-compose";

export interface MaverickDeclaration {
  [name: string]: Partial<DockerComposeService>;
}

export interface CompleteMaverickDeclaration {
  [name: string]: DockerComposeService;
}

export interface MaverickServiceConfig {
  // The following must be defined in entirety as they were not automatically found
  infrastructure?: MaverickDeclaration;
  images?: MaverickDeclaration;
  services?: MaverickDeclaration;
  packages?: MaverickDeclaration;
  batch?: MaverickDeclaration;
}

export type MaverickConfigSpecificDefaults = {
  /**
   * example:
   *
   * infrastructure: { command: ["echo", "goodbye"]}
   */
  [key in keyof MaverickServiceConfig]: Partial<DockerComposeService>;
};

export interface MaverickConfigDefaults extends MaverickConfigSpecificDefaults {
  all: Partial<DockerComposeService>;
}

export interface DockerComposeOverrides {
  // <T extends MaverickServiceConfig> {
  // [key in keyof ServiceKeys<T>]: DockerComposeService;
  [key: string]: DockerComposeService;
}

export type ServiceKeys<T extends MaverickServiceConfig> = T["infrastructure"] &
  T["images"] &
  T["services"] &
  T["packages"] &
  T["batch"];

export type PackageLanguage = "typescript" | "javascript";
export type ProjectLanguage = PackageLanguage | "unknown";

export type ProjectType = "lerna" | "nx" | "unknown";

export type PackageType = "service" | "package" | "unknown";

export interface MaverickRootConfig
  extends MaverickServiceConfig,
    DataSourceConfiguration {
  /** dictates existing networks for the project */
  networks?: string[];
  /** overrides the configuration of a specific Docker Compose Service */
  overrides?: DockerComposeOverrides;
  /** defaults for each category of Docker Compose services */
  defaults?: MaverickConfigDefaults;
  /** the WORKDIR of the Docker services */
  workspaceDir?: string;
  /** the type of monorepository tooling for the project */
  projectType?: ProjectType;
  /** the language used in the project */
  language?: ProjectLanguage;
  /** whether there is a `.env` file in the root of the project */
  dotenv?: boolean;
  /** contains the compose binary reference (can be full path or name of binary in PATH) */
  compose?: string;
  /** the name of the project dictated by the author */
  name?: string;
  /** the path of the projects setup script */
  setup?: string;
}

export interface DataSourceConfiguration {
  mysql?: DatabaseConfiguration;
  postgresql?: DatabaseConfiguration;
  redis?: Partial<DockerComposeService>;
  minio?: Partial<DockerComposeService>;
  ngrok?: Partial<DockerComposeService>;
}

export interface DatabaseConfiguration extends DockerComposeService {
  host?: string;
  user?: string;
  password?: string;
  port?: number;
}

export interface ComputedPackageInfo {
  /** the original package name in the repository */
  packageName: string;
  /**
   * This has been sanitized to be used for Docker Compose service names,
   * volume mounts, etc.
   * */
  safePackageName: string;
  /** path of package relative to root of lerna project */
  relativePath: string;
  /** language of the package */
  language: PackageLanguage;
  /** dependences contains the immediate dependencies and well as transient */
  dependencies: PackageDependencies;
  /** a hash of the sorted dependencies with their versions */
  dependencyHash: number;
  /** whether it is a service, package, or unknown */
  type: PackageType;
  /** whether the package contains a .env */
  dotenv?: boolean;
}

export interface PackageJsonDependencies {
  dependencies: DependencyMap;
  devDependencies: DependencyMap;
}

export interface DependencyMap {
  [packageName: string]: string;
}

export interface PackageDependencies {
  direct: string[];
  indirect: string[];
}

export interface ComputedProjectInfo {
  // stored in Maverick Config service already?
  pwd: string;
  // packages
  packages: Map<string, ComputedPackageInfo>;
  // typescript?
  language: ProjectLanguage;
}

export type InternalMaverickRootConfig = Required<MaverickRootConfig>;

export interface BuilderConfiguration<
  T extends MaverickRootConfig = MaverickRootConfig
> {
  config: T;
  defaults: MaverickConfigDefaults;
  overrides?: DockerComposeOverrides;
}

export interface Indexable {
  [key: string]: any;
  [key: number]: any;
}

export interface SetupConfiguration {
  exists: boolean;
  path: string;
}
