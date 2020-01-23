import { Service } from "typedi";
import { Config } from "../config";
import { Runner } from "./process";
import { Logger } from "./logger";
import { delay } from "../util/delay";
import { Generator } from "./generator";
import { SpawnSyncOptions } from "child_process";
import { ComposeBuilder, CategoricalServiceLists } from "./builder";
import { GenerateDockerCompose } from "../util/generate-compose";
import { MaverickServiceConfig } from "../types";
// import { Readable } from "stream";

@Service()
export class ComposeService {
  private readonly compose: string;
  private readonly spawnOpts: SpawnSyncOptions;
  private readonly defaultPhaseIncludeOptions: PhaseIncludeOptions = {
    infrastructure: true,
    images: false,
    packages: true,
    services: true,
    batch: true,
  };

  private _composeBuffer: Buffer | null = null;
  private bufferArgs: string[] = ["-f", "-"];

  public constructor(
    private logger: Logger,
    private runner: Runner,
    private config: Config,
    private composeBuilder: ComposeBuilder,
    private generator: Generator,
  ) {
    this.compose = config.compose;
    this.spawnOpts = {
      cwd: this.config.projectRoot,
      stdio: [null, process.stdout, process.stderr],
    };
  }

  @GenerateDockerCompose()
  public async up(args: string[]) {
    const phases = await this.getPhases(args, undefined, args.length > 0);

    this.logUp(phases.length);

    const commands: SpawnCommand[] = [
      ...phases.map(
        services =>
          [
            this.compose,
            [...this.bufferArgs, "up", "-d", "--no-recreate", ...services],
            this.spawnOpts,
          ] as Command,
      ),
    ];

    await this.runCommands(commands);
  }

  @GenerateDockerCompose()
  public async down(args: string[]) {
    const phases = await this.getPhases(args, undefined, args.length > 0);

    const commands: SpawnCommand[] = [];
    if (args.length > 0) {
      commands.push(
        ...phases.map(
          services =>
            [
              this.compose,
              [...this.bufferArgs, "stop", ...services],
              this.spawnOpts,
            ] as Command,
        ),
      );
    } else {
      commands.push([
        this.compose,
        [...this.bufferArgs, "down"],
        this.spawnOpts,
      ]);
    }

    this.logDown(commands.length);

    await this.runCommands(commands, 0);
  }

  @GenerateDockerCompose()
  public async restart(args: string[]) {
    const phases = await this.getPhases(args);

    this.logRestart(phases.length);

    const commands: SpawnCommand[] = [
      ...phases.map(
        services =>
          [
            this.compose,
            [...this.bufferArgs, "restart", ...services],
            this.spawnOpts,
          ] as Command,
      ),
    ];

    await this.runCommands(commands);
  }

  @GenerateDockerCompose()
  public async build(args: string[]) {
    const phases = await this.getPhases(args, {
      ...this.defaultPhaseIncludeOptions,
      images: true,
    });

    this.logBuild(phases.length);

    const commands = [
      ...phases.map(
        services =>
          [
            this.compose,
            [...this.bufferArgs, "build", ...services],
            { ...this.spawnOpts },
          ] as Command,
      ),
    ];

    await this.runCommands(commands);
  }

  @GenerateDockerCompose()
  public async ps() {
    await this.runCommands([[this.compose, [...this.bufferArgs, "ps"], { ...this.spawnOpts }]]);
  }

  private async runCommands(
    commands: Command[],
    delayTime: number = 1000,
  ): Promise<void> {
    const buffer = await this.composeBuffer();
    if (commands.length === 0) {
      return;
    }

    const [command, args, opts] = commands[0];
    this.logger.info(`Running: ${[command, ...args].join(" ")}`);

    const bufferOpts = {
      ...opts,
      input: buffer,
    };

    this.runner.spawnSync(command, args, bufferOpts);

    if (commands.length === 1) {
      return;
    }
    await delay(delayTime /* ms */);
    return this.runCommands([...commands.slice(1)]);
  }

  //@ts-ignore
  private handleExitCode(code: number) {
    const status = code === 0 ? "successfully" : "unsuccessfully";
    this.logger.trace(`Process exited ${status}`);
  }

  private async composeBuffer(): Promise<Buffer> {
    if (!this._composeBuffer) {
      this._composeBuffer = await this.generator.generate(false);
    }

    return this._composeBuffer;
  }

  // TODO: Asynchronous buffer as std.input
  // private convertBufferToStream(buffer: Buffer): Readable {
  //   const readable = new Readable();
  //   readable._read = () => {};
  //   readable.push(buffer);
  //   readable.push(null);
  //   return readable;
  // }

  private get categories(): CategoricalServiceLists {
    return this.composeBuilder.categories;
  }

  private async getPhases(
    args: string[],
    includeOptions: PhaseIncludeOptions = this.defaultPhaseIncludeOptions,
    includeDependencies: boolean = false,
  ) {
    const phaseOrdering: ServiceConfigKey[] = [
      "images",
      "infrastructure",
      "batch",
      "packages",
      "services",
    ];

    // Build out the phases that Maverick should load Docker services with. This
    // removes duplicate lists
    const categories = phaseOrdering
      .filter(phase => includeOptions[phase])
      .map(phase => this.categories[phase] || [])
      .filter(list => list.length > 0)
      .reduce(
        (catLists, catList) =>
          catLists.length > 0
            ? listEqual(catLists[catLists.length - 1], catList)
              ? catLists
              : [...catLists, catList]
            : [catList],
        [] as string[][],
      );

    // Calculate the final list of services based on dependency inclusion
    const services = includeDependencies
      ? await this.getDependenciesOfServices(args)
      : args;

    // If args were passed, run only those that were passed, in the same order
    // as we run categories usually, unless the phase is empty
    const phases =
      services.length === 0
        ? categories
        : categories
            .map(c => c.filter(s => services.indexOf(s) !== -1))
            .filter(c => c.length !== 0);

    return phases;
  }

  private async getDependenciesOfServices(
    inputSvcs: string[],
  ): Promise<string[]> {
    if (!inputSvcs || inputSvcs.length === 0) {
      return [];
    }

    const { services } = await this.composeBuilder.getDefinition();
    const serviceNames = Object.keys(services);

    const dependencies = inputSvcs.map(svc => {
      let lastCalculatedLength = 0;
      const svcDependencies = [svc];
      let searchNames = [svc];
      while (lastCalculatedLength !== svcDependencies.length) {
        lastCalculatedLength = svcDependencies.length;
        const newDeps = serviceNames.filter(name => {
          const dependsOn = (services[name] && services[name].depends_on) || [];
          if (dependsOn.length === 0) {
            return false;
          }

          const isDependency = searchNames.reduce(
            (found, name) => found || dependsOn.indexOf(name) !== -1,
            false,
          );
          return isDependency;
        });

        searchNames = newDeps;
        svcDependencies.push(...newDeps);
      }
      return new Set(svcDependencies);
    });

    return [
      ...dependencies.reduce(
        (set, depSet) =>
          Array.from(depSet).reduce((s, name) => s.add(name), set),
        new Set(),
      ),
    ];
  }

  private readonly logTemplate = (intro: string) => (l: number) => {
    this.logger.info(`${intro} in ${l} phase${pluralize(l)}`);
  };

  private readonly logUp = this.logTemplate("Spinning up Maverick");
  private readonly logDown = this.logTemplate("Spinning down Maverick");
  private readonly logBuild = this.logTemplate("Building with Maverick");
  private readonly logRestart = this.logTemplate("Restarting with Maverick");
}

function pluralize(num: number): string {
  return num > 1 || num == 0 ? "s" : "";
}

function listEqual<T extends any>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) {
    return false;
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

interface CwdOption {
  cwd?: string;
}
type Command = ExecCommand | SpawnCommand;
type ExecCommand = [string, string[]] | [string, string[], CwdOption];
type SpawnCommand = [string, string[]] | [string, string[], SpawnSyncOptions];

type ServiceConfigKey = keyof MaverickServiceConfig;
type PhaseIncludeOptions = { [key in ServiceConfigKey]: boolean };
