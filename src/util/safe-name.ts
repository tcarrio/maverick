export const safeCharacterMapping: SafeCharacterMapping = {
  "@": "",
  "/": "_"
};

export function convertToSafe(name: string): string {
  return Object.getOwnPropertyNames(safeCharacterMapping).reduce(
    (converted, key) => converted.replace(key, safeCharacterMapping[key]),
    name
  );
}

type SafeCharacterMapping = {
  [character: string]: string;
};
