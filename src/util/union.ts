import { Indexable } from "../types";

export function union<T extends Indexable>(...args: T[]): T;
export function union<T extends undefined>(...args: T[]): T;
export function union<T extends number>(...args: T[]): T;
export function union<T extends string>(...args: T[]): T;
export function union<T extends Array<any>>(...args: T[]): T;
export function union<T extends unknown>(...args: T[]): T;
export function union<T extends ValidTypes>(...args: T[]): T {
  // Removed any `undefined`s, and return undefined if all were
  args = args.filter((a: T) => a !== undefined);
  if (args.length === 0) {
    return (undefined as unknown) as T;
  }

  // Outlying types are removed from args for a more cohesive union
  args = args.filter((a: T) => typeof a !== args[args.length - 1]);

  // Arrays should be joined
  // NOTE: This treats arrays as sets, removing duplicate entries upon concatenation
  if (args[0] instanceof Array) {
    return args.reduce(
      // @ts-ignore
      (list, arg) => [...list, ...arg.filter(x => list.indexOf(x) === -1)],
      [],
    );
  }

  // If they aren't objects, override with the second value
  if (typeof args[0] !== "object") {
    return args[args.length - 1];
  }

  return args.reduce(
    (processed, obj) => unionObject(processed, obj as Indexable),
    {},
  ) as T;
}

export function unionObject<T1 extends Indexable, T2 extends Indexable>(
  a: T1,
  b: T2,
): T1 | T2 | (T1 & T2) {
  const ak: Set<keyof T1> = new Set(Object.getOwnPropertyNames(a));
  const bk: Set<keyof T2> = new Set(Object.getOwnPropertyNames(b));

  const onlyAKeys: (keyof T1)[] = [...ak].filter(k => !bk.has(k as any));
  const onlyBKeys: (keyof T2)[] = [...bk].filter(k => !ak.has(k as any));

  const onlyA = filterObjectToKeys(a, onlyAKeys);
  const onlyB = filterObjectToKeys(b, onlyBKeys);

  // @ts-ignore: this is failing to allow intersecting keys?
  const sharedKeys: (keyof T1 & keyof T2)[] = [...ak].filter(k =>
    bk.has(k as any),
  );

  const shared = sharedKeys.reduce((map, key) => {
    const aKey: unknown = a[key];
    const bKey: unknown = b[key];
    return { ...map, [key]: union(aKey, bKey) };
  }, {});

  return {
    ...onlyA,
    ...onlyB,
    ...shared,
  };
}

function filterObjectToKeys<T extends Indexable, K extends keyof T>(
  obj: T,
  keys: (keyof T)[],
): Pick<T, K> {
  const filteredObject: any = {};
  Object.getOwnPropertyNames(obj)
    .filter(k => keys.indexOf(k) >= 0)
    .forEach(k => (filteredObject[k] = obj[k as keyof T]));
  return filteredObject;
}

type ValidTypes =
  | Indexable
  | number
  | string
  | Array<any>
  | undefined
  | unknown;
