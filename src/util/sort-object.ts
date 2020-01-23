import { Indexable } from "../types";

export function sortObjectKeys(obj: Indexable): Indexable {
  return Object.keys(obj)
    .sort()
    .reduce(
      (map, key) => ({
        ...map,
        [key]:
          typeof obj[key] === "object" ? sortObjectKeys(obj[key]) : obj[key],
      }),
      {},
    );
}
