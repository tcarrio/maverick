import { DockerComposeService } from "../../../@types/docker-compose";
import { DataSourceConfiguration } from "../../../types";

type MysqlConfiguration = DockerComposeService & DataSourceConfiguration;

export const defaultMysqlConfiguration: MysqlConfiguration = {
  image: "mysql:5.7",
  ports: ["3306:3306"],
  volumes: ["mysql-data:/var/lib/mysql"]
};
