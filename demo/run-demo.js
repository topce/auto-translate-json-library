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
  console.log("--- Auto Translate JSON Library - Demo Script ---");
  console.log("Usage: node run-demo.js [format] [--engine=ENGINE]");
  console.log("");
  console.log("Available formats:");
  console.log("  json       - JSON translation files");
  console.log("  xml        - Android XML files");
  console.log("  arb        - Flutter ARB files");
  console.log("  po         - GNU gettext PO files");
  console.log("  yaml       - YAML translation files");
  console.log("  properties - Java Properties files");
  console.log("  csv        - CSV files");
  console.log("  advanced   - Advanced options demo");
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
    "  node run-demo.js yaml                    # Run YAML demo with Hugging Face local",
  );
  console.log(
    "  node run-demo.js --format=po             # Run PO demo with Hugging Face local",
  );
  console.log(
    "  node run-demo.js --engine=huggingface    # Run all demos with Hugging Face cloud",
  );
  console.log(
    "  node run-demo.js --engine=openai         # Run all demos with OpenAI",
  );
  console.log(
    "  node run-demo.js json --engine=openai    # Run JSON demo with OpenAI",
  );
  console.log(
    "  node run-demo.js                         # Run all demos with Hugging Face local",
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

// Define all demo commands
const demoCommands = {
  json: () =>
    runCommand(
      `Basic JSON Translation: en.json -> fr.json using ${engine}`,
      `${cliPath} -s en -e ${engine} -f json source/en.json`,
    ),
  xml: () =>
    runCommand(
      "Android XML: en.xml -> fr.xml (auto-detected)",
      `${cliPath} -s en -f android-xml -e ${engine} source/en.xml`,
    ),
  arb: () =>
    runCommand(
      "Flutter ARB: en.arb -> fr.arb (English to French)",
      `${cliPath} -s en -f arb -e ${engine} source/en.arb`,
    ),
  po: () =>
    runCommand(
      "Gettext PO: en.po -> fr.po",
      `${cliPath} -s en -f po -e ${engine} source/en.po`,
    ),
  yaml: () =>
    runCommand(
      "YAML: en.yaml -> fr.yaml (English to French)",
      `${cliPath} -s en -f yaml -e ${engine} source/en.yaml`,
    ),
  properties: () =>
    runCommand(
      "Java Properties: en.properties -> fr.properties (English to French)",
      `${cliPath} -s en -f properties -e ${engine} source/en.properties`,
    ),
  csv: () =>
    runCommand(
      "CSV: en.csv -> fr.csv (English to French)",
      `${cliPath} -s en -f csv -e ${engine} source/en.csv`,
    ),
  advanced: () =>
    runCommand(
      "Advanced: Translate again keeping existing translations (Simulation)",
      `${cliPath} -s en -e ${engine} --keepTranslations source/en.json`,
    ),
};

console.log("--- Auto Translate JSON Library - Comprehensive Demo ---");
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
console.log(`Configuration: Engine=${engine}, ${modelInfo}\n`);

async function main() {
  if (engine === "huggingface-local") {
    await ensureHuggingFaceLocalModel(demoEnv);
  }

  if (targetFormat && demoCommands[targetFormat]) {
    console.log(`Running demo for format: ${targetFormat}\n`);
    demoCommands[targetFormat]();
  } else if (targetFormat) {
    console.log(`❌ Unknown format: ${targetFormat}`);
    console.log("Available formats: " + Object.keys(demoCommands).join(", "));
    process.exit(1);
  } else {
    console.log("Running all demos...\n");

    // Run all demos in order
    demoCommands.json();
    demoCommands.xml();
    demoCommands.arb();
    demoCommands.po();
    demoCommands.yaml();
    demoCommands.properties();
    demoCommands.csv();
    demoCommands.advanced();
  }

  console.log("\n--- Demo Completed ---");
  console.log("Check the demo/source folder for generated files.");

  if (!targetFormat) {
    console.log("\nUsage examples:");
    console.log(
      "  node run-demo.js yaml                    # Run YAML demo with Hugging Face local",
    );
    console.log(
      "  node run-demo.js --format=po             # Run PO demo with Hugging Face local",
    );
    console.log(
      "  node run-demo.js --engine=huggingface    # Run all demos with Hugging Face cloud",
    );
    console.log(
      "  node run-demo.js --engine=openai         # Run all demos with OpenAI",
    );
    console.log(
      "  node run-demo.js json --engine=openai    # Run JSON demo with OpenAI",
    );
  }
}

main().catch((err) => {
  console.error(`\n❌ Demo setup failed: ${err.message}`);
  process.exit(1);
});
