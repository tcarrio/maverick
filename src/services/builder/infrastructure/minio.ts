import { DockerComposeService } from "../../../@types/docker-compose";

export const defaultMinioConfiguration: DockerComposeService = {
  image: "minio/minio",
  volumes: ["minio-data:/data"],
  env_file: [".env"],
  command: ["--compat", "server", "--address", "0.0.0.0:9000", "/data"],
};
