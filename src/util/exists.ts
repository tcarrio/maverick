import fs from "fs";

export async function exists(filePath: string): Promise<boolean> {
  return new Promise((resolve, _reject) => {
    fs.exists(filePath, exists => {
      resolve(exists);
    });
  });
}
