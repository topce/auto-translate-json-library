import minimist from "minimist";
import c from "picocolors";
import { version } from "../package.json";
import { translate } from "./lib";
import { Configuration } from "./config";
import path from "path";
const arguments_ = process.argv.slice(2);
const flags = minimist(arguments_, {
  alias: {
    mode: ["m"],
  },
});
console.log(c.green(`Auto translate json cli v${version}`));

const inputPath = flags._[0];
const { mode } = flags;

const config: Configuration = {} as Configuration;
const googleApiKey = process.env.GOOGLE_API_KEY;
if (!googleApiKey) {
  console.log("Openai key not found in environment variable OPENAI_KEY");
  process.exit(1);
}
// set api key
config.translationKeyInfo = {
  kind: "google",
  apiKey: googleApiKey,
};
config.sourceLocale = "en";
config.mode = mode ?? "file";
const sourcePath = path.join(process.cwd(), inputPath);
console.log(c.green(`Translating ${sourcePath}`));

translate(sourcePath, config).catch((error) => {
  console.error(c.red("translate error:\n"), error);
  process.exit(1);
});
