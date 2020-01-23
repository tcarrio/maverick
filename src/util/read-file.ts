import fs from "fs";

export async function readFile(filePath: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, (err, data) => {
      if (!err) {
        resolve(data);
      }

      reject(err);
    });
  });
}
