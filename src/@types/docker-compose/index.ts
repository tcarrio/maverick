export interface DockerComposeService {
  image?: string;
  build?: {
    dockerfile?: string;
    context?: string;
    target?: string;
    args: { [key: string]: string };
  };
  environment?: string[];
  env_file?: string[];
  networks?: string[];
  ports?: string[];
  volumes?: string[];
  stdin_open?: boolean;
  tty?: boolean;
  command?: string | string[];
  depends_on?: string[];
}

export interface DockerComposeDefinition {
  version: string;
  services: { [name: string]: DockerComposeService };
  volumes: { [name: string]: object };
  networks: { [name: string]: object };
}
