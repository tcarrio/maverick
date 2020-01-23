import { DockerComposeService } from "../../../@types/docker-compose";

export const defaultNgrokConfiguration: DockerComposeService = {
  image: "wernight/ngrok",
  ports: ["4040:4040"],
  environment: [],
};
