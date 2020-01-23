export function getVersion() {
  let version: string | undefined;
  try {
    version = require("../../package.json").version;
  } catch {}
  return version ? version : "‾\\_⪽⪾_/‾";
}
