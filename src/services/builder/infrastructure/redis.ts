import { DockerComposeService } from "../../../@types/docker-compose";

export const defaultRedisConfiguration: DockerComposeService = {
  image: "redis:3",
  volumes: ["redis-data:/data"],
  ports: ["6379:6379"],
  command: "redis-server --appendonly yes"
};
