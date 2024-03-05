#!/usr/bin/env node

import path from "path";
import minimist from "minimist";
import c from "picocolors";
import { version } from "../../package.json";
import { Configuration } from "../config";
import { translate } from "../lib";

require("dotenv").config();

// Define a function to display the help message
function displayHelp() {
  console.log(`🔨 Auto translate json cli v${version}`);
  console.log("Usage: atj [options] <inputPath>");
  console.log("");
  console.log("Options:");
  console.log("  --help, -h               Display this help message");
  console.log(
    "  --mode, -m <mode>        Specify the translation mode:file or folder",
  );
  console.log(
    "  --engine, -e <engine>    Specify the translation engine:aws,azure,google,deepLPro,deepLFree or openai",
  );
  console.log("  --sourceLocale, -s <locale>  Specify the source locale");
  console.log(
    "  --keepTranslations, --no-keepTranslations  Keep or retranslate existing translations",
  );
  console.log(
    "  --keepExtraTranslations, --no-keepExtraTranslations  Keep or remove extra translations",
  );
  console.log("");
  console.log("Default values");
  console.log("  --mode, -m <mode>                                    file");
  console.log("  --engine, -e <engine>                                aws");
  console.log("  --sourceLocale, -s <locale>                          en");
  console.log(
    "  --keepTranslations, --no-keepTranslations            --keepTranslations",
  );
  console.log(
    "  --keepExtraTranslations, --no-keepExtraTranslations  --no-keepExtraTranslations",
  );
}

const arguments_ = process.argv.slice(2);

if (arguments_.length === 0) {
  displayHelp();
  process.exit(0);
}

const flags = minimist(arguments_, {
  alias: {
    mode: ["m"],
    engine: ["e"],
    keepTranslations: ["kt"],
    keepExtraTranslations: ["ket"],
    sourceLocale: ["s"],
    help: ["h"],
  },
  string: ["mode", "engine", "sourceLocale"],
  boolean: ["keepTranslations", "keepExtraTranslations", "help"],
  default: {
    engine: "aws",
    sourceLocale: "en",
    keepTranslations: true,
    keepExtraTranslations: false,
    mode: "file",
  },
});
console.log(c.green(`🔨 Auto translate json cli v${version}`));

if (flags.help) {
  displayHelp();
  process.exit(0);
}

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
      baseUrl: process.env.ATJ_OPEN_AI_BASE_URL ?? "https://api.openai.com/v1",
      model: process.env.ATJ_OPEN_AI_MODEL ?? "gpt-3.5-turbo",
      maxTokens: Number(process.env.ATJ_OPEN_AI_MAX_TOKENS ?? "256"),
      temperature: Number(process.env.ATJ_OPEN_AI_TEMPERATURE ?? "0"),
      topP: Number(process.env.ATJ_OPEN_AI_TOP_P ?? "1.0"),
      n: Number(process.env.ATJ_OPEN_AI_N ?? "1"),
      frequencyPenalty: Number(
        process.env.ATJ_OPEN_AI_FREQUENCY_PENALTY ?? "0",
      ),
      presencePenalty: Number(process.env.ATJ_OPEN_AI_PRESENCE_PENALTY ?? "0"),
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
config.keepTranslations = keepTranslations ? "keep" : "retranslate";
config.keepExtraTranslations = keepExtraTranslations ? "keep" : "remove";
config.mode = mode;
const sourcePath = path.join(process.cwd(), inputPath);
console.log(c.green(`🌐 Translating ${sourcePath}`));

translate(sourcePath, config).catch((error) => {
  console.error(c.red("❌ Translate error:\n"), error);
  process.exit(1);
});
