import updateNotifier from "update-notifier";
import path from "path";

export function checkForUpdate() {
  const pkg = require(path.join(__dirname, "..", "..", "package.json"));

  const notifier = updateNotifier({ pkg });

  if (notifier.update) {
    notifier.notify();
  }
}
