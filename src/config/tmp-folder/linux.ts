import fs from "fs";
import path from "path";
import { mkdirIfNotExists } from "../../util/mkdir-if-not-exists";
import { internalName } from "../../globals";

const defaultRamfs = "/dev/shm";
const defaultHome = process.env.HOME;

export const getLinuxTmpFolder = (name: string) => {
  if (fs.existsSync(defaultRamfs)) {
    const outputFolder = path.join(defaultRamfs, internalName, name);
    if (mkdirIfNotExists(outputFolder)) {
      return outputFolder;
    }
  }

  if (!defaultHome) {
    return;
  }

  if (fs.existsSync(defaultHome)) {
    const maverickXdgCache = path.join(
      defaultHome,
      ".cache",
      internalName,
      name
    );
    if (mkdirIfNotExists(maverickXdgCache)) {
      const outputFolder = path.join(defaultHome, name);
      if (mkdirIfNotExists(outputFolder)) {
        return outputFolder;
      }
    }
  }

  return;
};
