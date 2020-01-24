import {
  DataSourceConfiguration,
  MaverickConfigDefaults
} from "../../../types";
import { union } from "../../../util/union";
import { defaultMinioConfiguration } from "./minio";
import { defaultMysqlConfiguration } from "./mysql";
import { defaultNgrokConfiguration } from "./ngrok";
import { defaultRedisConfiguration } from "./redis";

type BuiltinMap = {
  [key in keyof DataSourceConfiguration]: DataSourceConfiguration[key];
};

type BuiltinGetters = {
  [key in keyof DataSourceConfiguration]: (
    definition: DataSourceConfiguration[key],
    defaults: MaverickConfigDefaults
  ) => DataSourceConfiguration[key];
};

function getBuiltin<T extends keyof DataSourceConfiguration>(
  this: BuiltinMap,
  key: T,
  definition: DataSourceConfiguration[T],
  defaults: MaverickConfigDefaults
) {
  if (definition === undefined) {
    return undefined;
  }

  if (definition === null) {
    return union(this[key], defaults.all, defaults.infrastructure);
  }

  return union(this[key], defaults.all, defaults.infrastructure, definition);
}

const builtinMap: BuiltinMap = {
  minio: defaultMinioConfiguration,
  mysql: defaultMysqlConfiguration,
  ngrok: defaultNgrokConfiguration,
  redis: defaultRedisConfiguration,
  // TODO: Implement postgres
  postgresql: {}
};

export const builtins: BuiltinGetters = {
  minio: getBuiltin.bind(builtinMap, "minio"),
  mysql: getBuiltin.bind(builtinMap, "mysql"),
  ngrok: getBuiltin.bind(builtinMap, "ngrok"),
  redis: getBuiltin.bind(builtinMap, "redis"),
  postgresql: getBuiltin.bind(builtinMap, "postgresql")
};
