#!/usr/bin/env node

import { existsSync } from "node:fs";
import path from "node:path";
import type { InferenceProviderOrPolicy } from "@huggingface/inference";
import minimist from "minimist";
import c from "picocolors";
import packageJson from "../../package.json" with { type: "json" };

const { version } = packageJson;

import { config as dotenvConfig } from "dotenv";
import type { Configuration } from "../config.js";

dotenvConfig();

const formatDetails = {
  json: { extensions: [".json"], description: "JSON translation files" },
  arb: {
    extensions: [".arb"],
    description: "Flutter Application Resource Bundle",
  },
  xml: { extensions: [".xml"], description: "Generic XML translation files" },
  "android-xml": {
    extensions: [".xml"],
    description: "Android strings.xml format",
  },
  "ios-xml": {
    extensions: [".xml"],
    description: "iOS localization XML format",
  },
  "generic-xml": { extensions: [".xml"], description: "Generic XML format" },
  xliff: {
    extensions: [".xlf", ".xliff"],
    description: "XLIFF 1.2 and 2.x translation files",
  },
  xmb: {
    extensions: [".xmb"],
    description: "XML Message Bundle source files",
  },
  xtb: { extensions: [".xtb"], description: "XML Translation Bundle files" },
  po: { extensions: [".po"], description: "GNU gettext PO files" },
  pot: {
    extensions: [".pot"],
    description: "GNU gettext POT template files",
  },
  yaml: {
    extensions: [".yaml", ".yml"],
    description: "YAML translation files",
  },
  properties: {
    extensions: [".properties"],
    description: "Java Properties files",
  },
  csv: { extensions: [".csv"], description: "Comma-separated values files" },
  tsv: { extensions: [".tsv"], description: "Tab-separated values files" },
} as const;

const supportedFormats = Object.keys(formatDetails);

// Define a function to display the help message
function displayHelp() {
  console.log(`🔨 Auto translate json/xml cli v${version}`);
  console.log("Usage: atj [options] <inputPath>");
  console.log("");
  console.log("Options:");
  console.log("  --help, -h               Display this help message");
  console.log("  --list-formats           List all supported file formats");
  console.log(
    "  --json, -j               Output in JSON format (LLM-friendly)",
  );
  console.log(
    "  --mode, -m <mode>        Specify the translation mode:file or folder",
  );
  console.log(
    "  --engine, -e <engine>    Specify the translation engine:aws,azure,google,deepLPro,deepLFree,openai,huggingface,huggingface-local",
  );
  console.log("  --sourceLocale, -s <locale>  Specify the source locale");
  console.log(
    "  --format, -f <format>    Manually specify the file format (overrides auto-detection)",
  );
  console.log(
    "  Note: inputPath can be a translation file in any supported format, or a folder structure",
  );
  console.log(
    "  --keepTranslations, --no-keepTranslations  Keep or retranslate existing translations",
  );
  console.log(
    "  --keepExtraTranslations, --no-keepExtraTranslations  Keep or remove extra translations",
  );
  console.log("");
  console.log("Supported formats:");
  const formatGroups = {
    "JSON-based": ["json", "arb"],
    "XML-based": [
      "xml",
      "android-xml",
      "ios-xml",
      "generic-xml",
      "xliff",
      "xmb",
      "xtb",
    ],
    "Text-based": ["po", "pot", "yaml", "properties"],
    Tabular: ["csv", "tsv"],
  };

  for (const [group, groupFormats] of Object.entries(formatGroups)) {
    const availableFormats = groupFormats.filter((f) =>
      supportedFormats.includes(f),
    );
    if (availableFormats.length > 0) {
      console.log(`  ${group}: ${availableFormats.join(", ")}`);
    }
  }
  console.log("");
  console.log("Format examples:");
  console.log("  JSON:        translations.json, app.arb (Flutter)");
  console.log(
    "  XML:         strings.xml (Android), messages.xlf (XLIFF), template.xmb (Google)",
  );
  console.log(
    "  Text:        messages.po (gettext), config.yaml, app.properties (Java)",
  );
  console.log("  Tabular:     translations.csv, data.tsv");
  console.log("");
  console.log("Usage examples:");
  console.log(
    "  atj translations.json                    # Auto-detect JSON format",
  );
  console.log("  atj --format xliff messages.xlf         # Force XLIFF format");
  console.log(
    "  atj --mode folder locales/               # Process entire folder",
  );
  console.log(
    "  atj --engine google --format po msgs.po  # Use Google Translate with PO files",
  );
  console.log(
    "  atj --engine huggingface-local demo.json # Use local Hugging Face model",
  );
  console.log(
    "  atj --engine openai --sourceLocale en --format yaml config.yaml",
  );
  console.log("  atj --engine huggingface --mode folder translations/");
  console.log("");
  console.log("Comprehensive examples:");
  console.log("  # Basic translation with auto-detection");
  console.log("  atj translations/en.json");
  console.log("");
  console.log("  # Specify engine and format");
  console.log("  atj --engine google --format json translations.json");
  console.log("  atj --engine azure --format xml strings.xml");
  console.log("  atj --engine openai --format yaml config.yaml");
  console.log("");
  console.log("  # Local inference (no API keys needed)");
  console.log("  atj --engine huggingface-local demo.json");
  console.log("  atj --engine openai --sourceLocale en messages.po");
  console.log("");
  console.log("  # Folder mode for project structure");
  console.log("  atj --mode folder --engine google locales/");
  console.log("  atj --mode folder --engine huggingface-local translations/");
  console.log("");
  console.log("  # Advanced options");
  console.log(
    "  atj --engine google --sourceLocale en --keepTranslations app.json",
  );
  console.log("  atj --engine azure --no-keepExtraTranslations strings.xml");
  console.log("");
  console.log("  # JSON output for LLM/automation");
  console.log("  atj --engine huggingface-local --json demo.json");
  console.log("  atj --engine google --json --format po messages.po");
  console.log("  atj --format xliff messages.xlf         # Force XLIFF format");
  console.log(
    "  atj --mode folder locales/               # Process entire folder",
  );
  console.log(
    "  atj --engine google --format po msgs.po  # Use Google Translate with PO files",
  );
  console.log(
    "  atj --engine huggingface-local demo.json # Use local Hugging Face model",
  );
  console.log(
    "  atj --engine openai --sourceLocale en --format yaml config.yaml",
  );
  console.log("  atj --engine huggingface --mode folder translations/");
  console.log("");
  console.log("Default values");
  console.log("  --mode, -m <mode>                                    file");
  console.log("  --engine, -e <engine>                                aws");
  console.log("  --sourceLocale, -s <locale>                          en");
  console.log(
    "  --format, -f <format>                                auto-detect",
  );
  console.log(
    "  --keepTranslations, --no-keepTranslations            --keepTranslations",
  );
  console.log(
    "  --keepExtraTranslations, --no-keepExtraTranslations  --no-keepExtraTranslations",
  );
  console.log("  --json, -j                                           false");
  console.log("");
  console.log("Engine details:");
  console.log(
    "  aws              - AWS Translate (requires ATJ_AWS_* env vars)",
  );
  console.log(
    "  azure            - Azure Translator (requires ATJ_AZURE_* env vars)",
  );
  console.log(
    "  google           - Google Translate (requires ATJ_GOOGLE_API_KEY)",
  );
  console.log(
    "  deepLPro         - DeepL Pro API (requires ATJ_DEEPL_PRO_SECRET_KEY)",
  );
  console.log(
    "  deepLFree        - DeepL Free API (requires ATJ_DEEPL_FREE_SECRET_KEY)",
  );
  console.log(
    "  openai           - OpenAI API or local Ollama (requires ATJ_OPEN_AI_SECRET_KEY)",
  );
  console.log(
    "  huggingface      - Hugging Face Cloud API (requires ATJ_HUGGING_FACE_API_KEY)",
  );
  console.log(
    "  huggingface-local - Hugging Face Local ONNX (requires ATJ_HUGGING_FACE_LOCAL_MODEL)",
  );
  console.log("");
  console.log(
    "Performance note: Engines use lazy loading - only the selected engine is loaded.",
  );
}

// Define a function to list supported formats
function listFormats() {
  console.log(`🔨 Auto translate json/xml cli v${version}`);
  console.log("");
  console.log("Supported file formats:");
  console.log("");

  for (const format of [...supportedFormats].sort()) {
    const details = formatDetails[format as keyof typeof formatDetails];
    if (details) {
      console.log(
        `  ${format.padEnd(15)} ${details.extensions.join(", ").padEnd(20)} ${details.description}`,
      );
    }
  }

  console.log("");
  console.log("Usage examples:");
  console.log("  atj --format json translations.json");
  console.log("  atj --format xliff messages.xlf");
  console.log("  atj --format po locales/messages.po");
  console.log("  atj --format yaml config/translations.yaml");
  console.log("  atj --format arb --engine google lib/l10n/app_en.arb");
  console.log(
    "  atj --format android-xml --sourceLocale en res/values/strings.xml",
  );
  console.log("  atj --engine huggingface-local demo.json");
  console.log("  atj --engine openai --format yaml config.yaml");
  console.log("  atj --engine huggingface --mode folder translations/");
  console.log("");
  console.log("Best practices:");
  console.log("  • Format is usually auto-detected from file extension");
  console.log("  • Use --format to override auto-detection when needed");
  console.log(
    "  • For XML files, specify the exact variant (android-xml, ios-xml, xliff)",
  );
  console.log("  • Use --keepTranslations to preserve existing translations");
  console.log("  • Test with a single file before processing entire folders");
  console.log("  • Engines use lazy loading - only needed SDKs are loaded");
  console.log(
    "  • For local inference: huggingface-local (ONNX) or openai (Ollama)",
  );
  console.log("  • Set environment variables in .env file for API keys");
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
    format: ["f"],
    help: ["h"],
    json: ["j"],
  },
  string: ["mode", "engine", "sourceLocale", "format"],
  boolean: [
    "keepTranslations",
    "keepExtraTranslations",
    "help",
    "list-formats",
    "json",
  ],
  default: {
    engine: "aws",
    sourceLocale: "en",
    keepTranslations: true,
    keepExtraTranslations: false,
    mode: "file",
    json: false,
  },
});
console.log(c.green(`🔨 Auto translate json cli v${version}`));

if (flags.help) {
  displayHelp();
  process.exit(0);
}

if (flags["list-formats"]) {
  listFormats();
  process.exit(0);
}

const inputPath = flags._[0];
const {
  mode,
  engine,
  sourceLocale,
  keepTranslations,
  keepExtraTranslations,
  format,
  json,
} = flags;

// Validate input path
if (!inputPath) {
  console.error(c.red("❌ Input path is required"));
  console.error(c.yellow("💡 Usage: atj [options] <inputPath>"));
  process.exit(1);
}

// Validate format if specified
if (format && !supportedFormats.includes(format)) {
  console.error(c.red(`❌ Unsupported format: ${format}`));
  console.error(c.yellow("💡 Use --list-formats to see all supported formats"));
  process.exit(1);
}

// Validate mode
if (mode && !["file", "folder"].includes(mode)) {
  console.error(c.red(`❌ Invalid mode: ${mode}`));
  console.error(c.yellow("💡 Mode must be either 'file' or 'folder'"));
  process.exit(1);
}

// Validate engine
const validEngines = [
  "aws",
  "azure",
  "google",
  "deepLPro",
  "deepLFree",
  "openai",
  "huggingface",
  "huggingface-local",
];
if (engine && !validEngines.includes(engine)) {
  console.error(c.red(`❌ Invalid engine: ${engine}`));
  console.error(c.yellow(`💡 Supported engines: ${validEngines.join(", ")}`));
  process.exit(1);
}

// Check if input path exists
if (!existsSync(inputPath)) {
  console.error(c.red(`❌ Input path does not exist: ${inputPath}`));
  process.exit(1);
}

const config: Configuration = {} as Configuration;

// set translate engine config
switch (engine) {
  case "google": {
    const googleApiKey = process.env.ATJ_GOOGLE_API_KEY;
    if (!googleApiKey) {
      console.error(
        c.red(
          "❌ Google API key not found in environment variable ATJ_GOOGLE_API_KEY",
        ),
      );
      console.error(
        c.yellow(
          "💡 Get API key: https://cloud.google.com/translate/docs/setup",
        ),
      );
      console.error(
        c.yellow("💡 Set ATJ_GOOGLE_API_KEY in .env file or environment"),
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
    const openaiApiKey = process.env.ATJ_OPEN_AI_SECRET_KEY;
    if (!openaiApiKey) {
      console.error(
        c.red(
          "❌ OpenAI API key not found in environment variable ATJ_OPEN_AI_SECRET_KEY",
        ),
      );
      console.error(
        c.yellow(
          "💡 For OpenAI: Set ATJ_OPEN_AI_SECRET_KEY to your OpenAI API key",
        ),
      );
      console.error(
        c.yellow(
          "💡 For local Ollama: Set ATJ_OPEN_AI_SECRET_KEY to 'ollama' and ATJ_OPEN_AI_BASE_URL to 'http://localhost:11434'",
        ),
      );
      console.error(
        c.yellow(
          "💡 Example for Ollama: ATJ_OPEN_AI_SECRET_KEY=ollama ATJ_OPEN_AI_BASE_URL=http://localhost:11434",
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
      temperature: Number(process.env.ATJ_OPEN_AI_TEMPERATURE ?? "0.7"),
      topP: Number(process.env.ATJ_OPEN_AI_TOP_P ?? "0.9"),
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
  case "huggingface": {
    const huggingFaceApiKey = process.env.ATJ_HUGGING_FACE_API_KEY;
    if (!huggingFaceApiKey) {
      console.error(
        c.red(
          "❌ Hugging Face API key not found in environment variable ATJ_HUGGING_FACE_API_KEY",
        ),
      );
      process.exit(1);
    }
    config.translationKeyInfo = {
      kind: "huggingface",
      apiKey: huggingFaceApiKey,
      model: process.env.ATJ_HUGGING_FACE_MODEL ?? "Helsinki-NLP/opus-mt-en-fr",
      provider: process.env.ATJ_HUGGING_FACE_PROVIDER as
        | InferenceProviderOrPolicy
        | undefined,
    };
    break;
  }
  case "huggingface-local": {
    const huggingFaceLocalModel = process.env.ATJ_HUGGING_FACE_LOCAL_MODEL;
    if (!huggingFaceLocalModel) {
      console.error(
        c.red(
          "❌ Hugging Face local model not found in environment variable ATJ_HUGGING_FACE_LOCAL_MODEL",
        ),
      );
      console.error(
        c.yellow(
          "💡 Set ATJ_HUGGING_FACE_LOCAL_MODEL in .env file or environment",
        ),
      );
      console.error(
        c.yellow(
          "💡 Example: ATJ_HUGGING_FACE_LOCAL_MODEL=Xenova/opus-mt-en-fr",
        ),
      );
      console.error(
        c.yellow(
          "💡 Available models: https://huggingface.co/models?pipeline_tag=translation",
        ),
      );
      process.exit(1);
    }
    config.translationKeyInfo = {
      kind: "huggingface-local",
      model: huggingFaceLocalModel,
    };
    break;
  }
  default:
    console.error(c.red(`❌ Engine ${engine} not supported`));
    process.exit(1);
}

if (process.env.ATJ_START_DELIMITER) {
  config.startDelimiter = process.env.ATJ_START_DELIMITER;
}

if (process.env.ATJ_END_DELIMITER) {
  config.endDelimiter = process.env.ATJ_END_DELIMITER;
}

config.sourceLocale = sourceLocale;
config.keepTranslations = keepTranslations ? "keep" : "retranslate";
config.keepExtraTranslations = keepExtraTranslations ? "keep" : "remove";
config.mode = mode;
if (format) {
  config.format = format;
}

async function main() {
  // Load the translation runtime only when an actual translation command is executed.
  await import("../format/index.js");
  const { translate } = await import("../lib.js");

  const sourcePath = path.join(process.cwd(), inputPath);

  if (json) {
    // JSON output mode - capture console output
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    const logs: Array<{ type: string; message: string; timestamp: number }> =
      [];

    console.log = (...args) => {
      logs.push({
        type: "log",
        message: args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg) : String(arg),
          )
          .join(" "),
        timestamp: Date.now(),
      });
    };

    console.error = (...args) => {
      logs.push({
        type: "error",
        message: args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg) : String(arg),
          )
          .join(" "),
        timestamp: Date.now(),
      });
    };

    console.warn = (...args) => {
      logs.push({
        type: "warn",
        message: args
          .map((arg) =>
            typeof arg === "object" ? JSON.stringify(arg) : String(arg),
          )
          .join(" "),
        timestamp: Date.now(),
      });
    };

    const startTime = Date.now();

    try {
      await translate(sourcePath, config);
      const endTime = Date.now();

      const result = {
        command: "translate",
        version,
        timestamp: new Date().toISOString(),
        input: {
          path: sourcePath,
          mode,
          engine,
          sourceLocale,
          format: format || "auto",
          keepTranslations,
          keepExtraTranslations,
        },
        performance: {
          startTime,
          endTime,
          totalMs: endTime - startTime,
        },
        logs,
        status: "success",
        message: "Translation completed successfully",
      };

      // Restore console
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;

      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      const errorTime = Date.now();

      const result = {
        command: "translate",
        version,
        timestamp: new Date().toISOString(),
        input: {
          path: sourcePath,
          mode,
          engine,
          sourceLocale,
          format: format || "auto",
          keepTranslations,
          keepExtraTranslations,
        },
        performance: {
          startTime,
          errorTime,
          totalMs: errorTime - startTime,
        },
        logs,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };

      // Restore console
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;

      console.log(JSON.stringify(result, null, 2));
      process.exit(1);
    }
  } else {
    // Normal output mode
    console.log(c.green(`🌐 Translating ${sourcePath}`));
    await translate(sourcePath, config);
  }
}

main().catch((error) => {
  console.error(c.red("❌ Translate error:\n"), error);
  process.exit(1);
});
