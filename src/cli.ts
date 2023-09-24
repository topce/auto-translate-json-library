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
    engine: ["e"],
    keepTranslations: ["kt"],
    keepExtraTranslations: ["ket"],
    sourceLocale: ["s"],
  },
  string: ["mode", "engine", "sourceLocale"],
  boolean: ["keepTranslations", "keepExtraTranslations"],
  default: {
    engine: "google",
    sourceLocale: "en",
    keepTranslations: true,
    keepExtraTranslations: true,
    mode: "file",
  },
});
console.log(c.green(`🔨 Auto translate json cli v${version}`));

const inputPath = flags._[0];
const { mode, engine, sourceLocale, keepTranslations, keepExtraTranslations } =
  flags;

const config: Configuration = {} as Configuration;

// set translate engine config
switch (engine) {
  case "google": {
    const googleApiKey = process.env.ATJ_GOOGLE_API_KEY;
    if (!googleApiKey) {
      console.error(
        c.red(
          "❌ Google api key not found in environment variable ATJ_GOOGLE_API_KEY",
        ),
      );
      process.exit(1);
    }
    config.translationKeyInfo = {
      kind: "google",
      apiKey: googleApiKey,
    };
    break;
  }
  case "aws": {
    const awsAccessKeyId = process.env.ATJ_AWS_ACCESS_KEY_ID;
    const awsSecretAccessKey = process.env.ATJ_AWS_SECRET_ACCESS_KEY;
    const awsRegion = process.env.ATJ_AWS_REGION;
    if (!awsAccessKeyId || !awsSecretAccessKey || !awsRegion) {
      console.error(
        c.red(
          "❌ AWS credentials not found in environment variables ATJ_AWS_ACCESS_KEY_ID, ATJ_AWS_SECRET_ACCESS_KEY, ATJ_AWS_REGION",
        ),
      );
      process.exit(1);
    }
    config.translationKeyInfo = {
      kind: "aws",
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
      region: awsRegion,
    };
    break;
  }
  case "azure": {
    const azureSecretKey = process.env.ATJ_AZURE_SECRET_KEY;
    const azureRegion = process.env.ATJ_AZURE_REGION;
    if (!azureSecretKey || !azureRegion) {
      console.error(
        c.red(
          "❌ Azure credentials not found in environment variables ATJ_AZURE_SECRET_KEY, ATJ_AZURE_REGION",
        ),
      );
      process.exit(1);
    }
    config.translationKeyInfo = {
      kind: "azure",
      secretKey: azureSecretKey,
      region: azureRegion,
    };
    break;
  }
  case "openai": {
    const openaiApiKey = process.env.ATJ_OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error(
        c.red(
          "❌ Openai api key not found in environment variable ATJ_OPENAI_API_KEY",
        ),
      );
      process.exit(1);
    }
    config.translationKeyInfo = {
      kind: "openai",
      apiKey: openaiApiKey,
    };
    break;
  }
  case "deepLPro": {
    const deepLProSecretKey = process.env.ATJ_DEEPL_PRO_SECRET_KEY;
    if (!deepLProSecretKey) {
      console.log(
        c.red(
          "❌ DeepL pro api key not found in environment variable ATJ_DEEPL_PRO_SECRET_KEY",
        ),
      );
      process.exit(1);
    }
    config.translationKeyInfo = {
      kind: "deepLPro",
      secretKey: deepLProSecretKey,
    };
    break;
  }
  case "deepLFree": {
    const deepLFreeSecretKey = process.env.ATJ_DEEPL_FREE_SECRET_KEY;
    if (!deepLFreeSecretKey) {
      console.error(
        c.red(
          "❌ DeepL free api key not found in environment variable ATJ_DEEPL_FREE_SECRET_KEY",
        ),
      );
      process.exit(1);
    }
    config.translationKeyInfo = {
      kind: "deepLFree",
      secretKey: deepLFreeSecretKey,
    };
    break;
  }
  default:
    console.error(c.red(`❌ Engine ${engine} not supported`));
    process.exit(1);
}

config.sourceLocale = sourceLocale;
config.keepTranslations = keepTranslations ? 'keep' : 'retranslate';
config.keepExtraTranslations = keepExtraTranslations ? 'keep' : 'remove';
config.mode = mode;
const sourcePath = path.join(process.cwd(), inputPath);
console.log(c.green(`🌐 Translating ${sourcePath}`));

translate(sourcePath, config).catch((error) => {
  console.error(c.red("❌ Translate error:\n"), error);
  process.exit(1);
});
