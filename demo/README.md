# Auto Translate JSON Library - Demo

This folder contains a demonstration of the `auto-translate-json-library` capabilities.

## Contents
- `source/`: Sample translation files in different formats (JSON, Android XML, PO).
- `run-demo.js`: A Node.js script that runs the translation tool against the sample files to demonstrate various features.

## Prerequisites
- Node.js installed.
- Valid API keys for the translation engines you wish to test (Google, AWS, Azure, DeepL, OpenAI) set as environment variables or in a `.env` file in the root of the project.
- The project must be built (`npm run build` in the root).

## How to Run
1. Open a terminal in the root of the project.
2. Run the demo script:
   ```bash
   node demo/run-demo.js
   ```

## What it does
The `run-demo.js` script executes the auto-translate CLI tool to demonstrate translation of various formats:

1. **JSON**: Basic translation (`en.json` -> `fr.json`).
2. **Android XML**: Preserving attributes and structure (`en.xml` -> `fr.xml`).
3. **Flutter ARB**: Handling complex ARB features (`en.arb` -> `fr.arb`).
4. **Gettext PO**: Standard PO file translation (`en.po` -> `fr.po`).
5. **YAML**: YAML configuration translation (`en.yaml` -> `fr.yaml`).
6. **Properties**: Java properties files (`en.properties` -> `fr.properties`).
7. **CSV**: Comma-separated values (`en.csv` -> `fr.csv`).

It demonstrates:
- **Format Auto-detection**: The tool automatically detects file types.
- **Source Locale**: Setting the source language (e.g., `-s en`).
- **Engine Selection**: Specifying different engines (Google, etc.).
- **Local AI (Ollama)**: The demo is configured to use a local OpenAI-compatible server (like Ollama) with the `gemma2:9b` model.

## Configuration
The demo script (`run-demo.js`) is pre-configured with the following settings for Local AI:
- URL: `http://localhost:11434/v1`
- Model: `gemma2:9b`
- Key: `ollama`

You can modify these configurations in the `demoEnv` object within `run-demo.js`.
