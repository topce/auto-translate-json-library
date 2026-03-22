const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

async function ensureHuggingFaceLocalModel(env) {
  const model = env.ATJ_HUGGING_FACE_LOCAL_MODEL;

  if (!model) {
    throw new Error(
      "ATJ_HUGGING_FACE_LOCAL_MODEL is required for the huggingface-local engine",
    );
  }

  console.log(`\n>>> Preparing Hugging Face local model: ${model}`);
  console.log(
    "    Downloading model from Hugging Face on first run and warming local cache with translation pipeline...",
  );

  const { pipeline } = await import("@huggingface/transformers");
  const runner = await pipeline("translation", model);
  await runner("Hello world", {
    src_lang: env.ATJ_SOURCE_LOCALE || "en",
    tgt_lang: "fr",
  });

  console.log("    ✅ Model is ready");
}

// Pointing to the built CLI directly to avoid Windows .bin linking issues
const cliPath = path.resolve(__dirname, "..", "build", "src", "bin", "cli.js");
const sourceDir = path.join(__dirname, "source");

// Load .env file
require("dotenv").config({ path: path.join(__dirname, ".env") });

// Demo Configuration (Ollama / Local AI)
const demoEnv = {
  ...process.env, // Inherit existing system envs and loaded .env vars
};

// Parse command line arguments
const args = process.argv.slice(2);
const targetFormat =
  args.find((arg) => arg.startsWith("--format="))?.split("=")[1] ||
  args.find((arg) => !arg.startsWith("--"));
const engine =
  args.find((arg) => arg.startsWith("--engine="))?.split("=")[1] ||
  "huggingface-local";

// Check for help
if (args.includes("--help") || args.includes("-h")) {
  console.log("--- Auto Translate JSON Library - Folder Mode Demo Script ---");
  console.log("Usage: node run-demo.js [format] [--engine=ENGINE]");
  console.log("");
  console.log("Available formats:");
  console.log("  json       - JSON translation files in folders");
  console.log("  xml        - Android XML files in folders");
  console.log("  arb        - Flutter ARB files in folders");
  console.log("  po         - GNU gettext PO files in folders");
  console.log("  yaml       - YAML translation files in folders");
  console.log("  properties - Java Properties files in folders");
  console.log("  csv        - CSV files in folders");
  console.log("  all        - All formats in folder structure");
  console.log("");
  console.log("Available engines:");
  console.log("  huggingface-local - Hugging Face local model (default)");
  console.log("  huggingface       - Hugging Face cloud API");
  console.log("  openai      - OpenAI or Ollama");
  console.log("  aws         - AWS Translate");
  console.log("  azure       - Azure Translator");
  console.log("  google      - Google Translate");
  console.log("  deepl       - DeepL");
  console.log("");
  console.log("Examples:");
  console.log(
    "  node run-demo.js yaml                    # Run YAML folder demo with Hugging Face local",
  );
  console.log(
    "  node run-demo.js --format=po             # Run PO folder demo with Hugging Face local",
  );
  console.log(
    "  node run-demo.js --engine=huggingface    # Run all folder demos with Hugging Face cloud",
  );
  console.log(
    "  node run-demo.js --engine=openai         # Run all demos with OpenAI",
  );
  console.log(
    "  node run-demo.js all --engine=openai     # Run all folder demos with OpenAI",
  );
  console.log(
    "  node run-demo.js                         # Run all folder demos with Hugging Face local",
  );
  process.exit(0);
}

// Helper to run commands
function runCommand(desc, cmd) {
  console.log(`\n>>> ${desc}`);
  console.log(`    Command: node ${cmd}`);
  try {
    // Pass the customized environment
    // On Windows, explicitly use node to execute the CLI
    execSync(`node ${cmd}`, {
      encoding: "utf8",
      env: demoEnv,
      stdio: "inherit",
      cwd: __dirname,
    });
    console.log("    ✅ Success");
  } catch (err) {
    const errorMsg =
      engine === "openai"
        ? `Check if Ollama is running at ${demoEnv.ATJ_OPEN_AI_BASE_URL || "http://localhost:11434"}`
        : engine === "huggingface-local"
          ? "Check Hugging Face model download and ATJ_HUGGING_FACE_LOCAL_MODEL configuration"
          : engine === "huggingface"
            ? "Check Hugging Face API key and model configuration"
            : "Check API configuration";
    console.log(`    ❌ Failed (${errorMsg})`);
  }
}

// Define all demo commands for folder mode
const demoCommands = {
  json: () => {
    runCommand(
      `JSON Folder Translation: common.json (en/ -> fr/) using ${engine}`,
      `${cliPath} -s en -e ${engine} -f json -m folder source/en/common.json`,
    );
    runCommand(
      `JSON Folder Translation: ui.json (en/ -> fr/) using ${engine}`,
      `${cliPath} -s en -e ${engine} -f json -m folder source/en/ui.json`,
    );
  },
  xml: () => {
    runCommand(
      `XML Folder Translation: app.xml (en/ -> fr/) using ${engine}`,
      `${cliPath} -s en -f android-xml -e ${engine} -m folder source/en/app.xml`,
    );
    runCommand(
      `XML Folder Translation: errors.xml (en/ -> fr/) using ${engine}`,
      `${cliPath} -s en -f android-xml -e ${engine} -m folder source/en/errors.xml`,
    );
  },
  arb: () => {
    runCommand(
      `ARB Folder Translation: app.arb (en/ -> fr/) using ${engine}`,
      `${cliPath} -s en -f arb -e ${engine} -m folder source/en/app.arb`,
    );
    runCommand(
      `ARB Folder Translation: welcome.arb (en/ -> fr/) using ${engine}`,
      `${cliPath} -s en -f arb -e ${engine} -m folder source/en/welcome.arb`,
    );
  },
  po: () => {
    runCommand(
      `PO Folder Translation: main.po (en/ -> fr/) using ${engine}`,
      `${cliPath} -s en -f po -e ${engine} -m folder source/en/main.po`,
    );
    runCommand(
      `PO Folder Translation: user.po (en/ -> fr/) using ${engine}`,
      `${cliPath} -s en -f po -e ${engine} -m folder source/en/user.po`,
    );
  },
  yaml: () => {
    runCommand(
      `YAML Folder Translation: config.yaml (en/ -> fr/) using ${engine}`,
      `${cliPath} -s en -f yaml -e ${engine} -m folder source/en/config.yaml`,
    );
    runCommand(
      `YAML Folder Translation: messages.yaml (en/ -> fr/) using ${engine}`,
      `${cliPath} -s en -f yaml -e ${engine} -m folder source/en/messages.yaml`,
    );
  },
  properties: () => {
    runCommand(
      `Properties Folder Translation: site.properties (en/ -> fr/) using ${engine}`,
      `${cliPath} -s en -f properties -e ${engine} -m folder source/en/site.properties`,
    );
    runCommand(
      `Properties Folder Translation: buttons.properties (en/ -> fr/) using ${engine}`,
      `${cliPath} -s en -f properties -e ${engine} -m folder source/en/buttons.properties`,
    );
  },
  csv: () => {
    runCommand(
      `CSV Folder Translation: content.csv (en/ -> fr/) using ${engine}`,
      `${cliPath} -s en -f csv -e ${engine} -m folder source/en/content.csv`,
    );
    runCommand(
      `CSV Folder Translation: layout.csv (en/ -> fr/) using ${engine}`,
      `${cliPath} -s en -f csv -e ${engine} -m folder source/en/layout.csv`,
    );
  },
  all: () => {
    console.log("\n>>> Running all folder mode translations...");
    demoCommands.json();
    demoCommands.xml();
    demoCommands.arb();
    demoCommands.po();
    demoCommands.yaml();
    demoCommands.properties();
    demoCommands.csv();
  },
};

console.log("--- Auto Translate JSON Library - Folder Mode Demo ---");
console.log(
  "This script demonstrates folder-based translation where files are organized by language folders.",
);
console.log(
  `This script demonstrates the features of the CLI tool using ${engine}.`,
);
const modelInfo =
  engine === "openai"
    ? `Model=${demoEnv.ATJ_OPEN_AI_MODEL}, URL=${demoEnv.ATJ_OPEN_AI_BASE_URL}`
    : engine === "huggingface-local"
      ? `Model=${demoEnv.ATJ_HUGGING_FACE_LOCAL_MODEL}`
      : engine === "huggingface"
        ? `Model=${demoEnv.ATJ_HUGGING_FACE_MODEL}, Provider=${demoEnv.ATJ_HUGGING_FACE_PROVIDER || "auto"}`
        : "Default configuration";
console.log(`Configuration: Engine=${engine}, ${modelInfo}, Mode=folder\n`);

async function main() {
  if (engine === "huggingface-local") {
    await ensureHuggingFaceLocalModel(demoEnv);
  }

  if (targetFormat && demoCommands[targetFormat]) {
    console.log(`Running folder demo for format: ${targetFormat}\n`);
    demoCommands[targetFormat]();
  } else if (targetFormat) {
    console.log(`❌ Unknown format: ${targetFormat}`);
    console.log("Available formats: " + Object.keys(demoCommands).join(", "));
    process.exit(1);
  } else {
    console.log("Running all folder demos...\n");

    demoCommands.all();
  }

  console.log("\n--- Folder Mode Demo Completed ---");
  console.log(
    "Check the demo-folder/source/fr/ folder for generated translation files.",
  );

  if (!targetFormat) {
    console.log("\nUsage examples:");
    console.log(
      "  node run-demo.js yaml                    # Run YAML folder demo with Hugging Face local",
    );
    console.log(
      "  node run-demo.js --format=po             # Run PO folder demo with Hugging Face local",
    );
    console.log(
      "  node run-demo.js --engine=huggingface    # Run all folder demos with Hugging Face cloud",
    );
    console.log(
      "  node run-demo.js --engine=openai         # Run all demos with OpenAI",
    );
    console.log(
      "  node run-demo.js all --engine=openai     # Run all folder demos with OpenAI",
    );
  }
}

main().catch((err) => {
  console.error(`\n❌ Demo setup failed: ${err.message}`);
  process.exit(1);
});
