import fs from "fs";

export function mkdirIfNotExists(folder: string): boolean {
  try {
    const exists = fs.existsSync(folder);
    if (exists) {
      return exists;
    }

    fs.mkdirSync(folder, { recursive: true });
    return true;
  } catch (err) {
    return false;
  }
}
