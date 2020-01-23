import { SetupInfo } from "../types";

export const posixSetupCommand = (info: SetupInfo) => {
  return `
    cd ${info.projectRoot}
    cd ..
    git clone ${info.moonrakerURL}
  `
}