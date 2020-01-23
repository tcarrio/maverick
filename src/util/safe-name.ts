export function convertToSafe(name: string): string {
  return name.replace("@", "").replace("/", "_");
}
