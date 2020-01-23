import { sortObjectKeys } from "../../util/sort-object";
import { hash } from "../../util/hash";
import { PackageJsonDependencies } from "../../types";

export function calculateDependencyHash(
  packageDependencies: PackageJsonDependencies,
) {
  return hash(JSON.stringify(sortObjectKeys(packageDependencies)));
}
