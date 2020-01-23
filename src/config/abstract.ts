import { MaverickRootConfig, SetupConfiguration } from "../types";

export abstract class AbstractConfig {
    public abstract readonly valid: boolean;
    public abstract readonly cwd: string;
    public abstract readonly projectName: string;
    public abstract readonly compose: string;
    public abstract readonly config: MaverickRootConfig;
    public abstract readonly projectRoot: string;
    public abstract readonly setup: SetupConfiguration;
}