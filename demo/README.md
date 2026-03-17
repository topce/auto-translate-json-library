# Auto Translate JSON Library - Demo

This folder contains a demonstration of the `auto-translate-json-library` capabilities with support for multiple translation engines including local AI models via Ollama.

## Demo Folders

- **`demo/`** (this folder) - **File Mode Demo**: Individual translation files (e.g., `en.json`, `fr.json`)
- **`demo-folder/`** - **Folder Mode Demo**: Language-organized directories (e.g., `en/common.json`, `fr/common.json`)

Choose the demo that matches your project structure:
- Use **file mode** for simple projects with one file per language
- Use **folder mode** for complex projects with multiple files per language

## Contents
- `source/`: Sample translation files in different formats (JSON, Android XML, PO, YAML, Properties, CSV, ARB)
- `run-demo.js`: A Node.js script that runs the translation tool against individual files to demonstrate various features
- `ollama.env`: Pre-configured environment variables for local Ollama setup (file mode)
- `reset-translations.js`: Script to reset all translated files to their original state
- `README.md`: This documentation

**For folder mode demo, see the `../demo-folder/` directory.**

## Prerequisites
- Node.js installed
- Valid API keys for the translation engines you wish to test (Google, AWS, Azure, DeepL, OpenAI) set as environment variables or in a `.env` file
- The project must be built (`npm run build` in the root)

## Setup for Local AI (Ollama) - Recommended for Demo

### 1. Install Ollama
Download and install Ollama from [https://ollama.com/](https://ollama.com/)

### 2. Download and Run the Required Model
The demo is configured to use the `qwen2.5:14b` model. Run these commands:

```bash
# Pull the model (this may take several minutes depending on your internet connection)
ollama pull qwen2.5:14b

# Start Ollama server (if not already running)
ollama serve

# Verify the model is available
ollama list
```



If you use a different model, update the `ATJ_OPEN_AI_MODEL` value in your `.env` file accordingly.

### 3. Configure Environment Variables
Copy the pre-configured Ollama environment file:

```bash
# From the demo directory
cp ollama.env .env
```

Or manually create a `.env` file in the demo directory with:
```env
ATJ_IGNORE_PREFIX="@@"
ATJ_START_DELIMITER="{{"
ATJ_END_DELIMITER="}}"
ATJ_MODE=file
ATJ_SOURCE_LOCALE=en
ATJ_KEEP_TRANSLATIONS=keep
ATJ_KEEP_EXTRA_TRANSLATIONS=remove
ATJ_OPEN_AI_SECRET_KEY=ollama
ATJ_OPEN_AI_BASE_URL=http://localhost:11434/v1
ATJ_OPEN_AI_MODEL=qwen2.5:14b
ATJ_OPEN_AI_MAX_TOKENS=512
```

## Alternative Setup for Cloud Translation Services

If you prefer to use cloud translation services instead of local AI, create a `.env` file with one of these configurations:

### Hugging Face Cloud
```env
ATJ_HUGGING_FACE_API_KEY=your_huggingface_token_here
ATJ_HUGGING_FACE_PROVIDER=hf-inference
ATJ_HUGGING_FACE_MODEL=Helsinki-NLP/opus-mt-en-fr
ATJ_SOURCE_LOCALE=en
```

Run it with:

```bash
cp ../huggingface.env .env
npm install
node run-demo.js --engine=huggingface
```

### Hugging Face Local
```env
ATJ_HUGGING_FACE_LOCAL_MODEL=Xenova/opus-mt-en-fr
ATJ_SOURCE_LOCALE=en
```

Run it with:

```bash
cp ../huggingface-local.env .env
npm install
node run-demo.js --engine=huggingface-local
```

### Google Translate
```env
ATJ_GOOGLE_API_KEY=your_google_api_key_here
ATJ_SOURCE_LOCALE=en
```

### OpenAI
```env
ATJ_OPEN_AI_SECRET_KEY=your_openai_api_key_here
ATJ_OPEN_AI_MODEL=gpt-4.1-mini
ATJ_SOURCE_LOCALE=en
```

### AWS Translate
```env
ATJ_AWS_ACCESS_KEY_ID=your_aws_access_key
ATJ_AWS_SECRET_ACCESS_KEY=your_aws_secret_key
ATJ_AWS_REGION=us-east-1
ATJ_SOURCE_LOCALE=en
```

## How to Run

### Quick Start with Ollama (Recommended)
1. Follow the Ollama setup instructions above
2. Ensure Ollama is running: `ollama serve`
3. From the demo directory, copy the environment file: `cp ollama.env .env`
4. Install demo dependencies: `npm install`
5. Run the demo: `npm run demo`

### Quick Start with Hugging Face
1. For cloud mode, copy `../huggingface.env` to `.env` and set `ATJ_HUGGING_FACE_API_KEY`
2. For local mode, copy `../huggingface-local.env` to `.env`
3. Install demo dependencies: `npm install`
4. Run cloud mode: `node run-demo.js --engine=huggingface`
5. Run local mode: `node run-demo.js --engine=huggingface-local`
6. On first local run, wait for the model download to complete

### Manual Execution
1. Open a terminal in the demo directory
2. Ensure you have a `.env` file configured (see setup instructions above)
3. Run the demo script:
   ```bash
   node run-demo.js
   ```

### Reset Translations
To reset all translated files and start fresh:
```bash
node reset-translations.js
```

## What it does
The `run-demo.js` script executes the auto-translate CLI tool to demonstrate translation of various formats in **file mode**:

1. **JSON**: Basic translation (`en.json` -> `fr.json`)
2. **Android XML**: Preserving attributes and structure (`en.xml` -> `fr.xml`)
3. **Flutter ARB**: Handling complex ARB features (`en.arb` -> `fr.arb`)
4. **Gettext PO**: Standard PO file translation (`en.po` -> `fr.po`)
5. **YAML**: YAML configuration translation (`en.yaml` -> `fr.yaml`)
6. **Properties**: Java properties files (`en.properties` -> `fr.properties`)
7. **CSV**: Comma-separated values (`en.csv` -> `fr.csv`)

It demonstrates:
- **Format Auto-detection**: The tool automatically detects file types
- **Source Locale**: Setting the source language (e.g., `-s en`)
- **Engine Selection**: Specifying different engines (Google, OpenAI, Ollama, etc.)
- **Local AI Integration**: Using local OpenAI-compatible servers like Ollama
- **Individual File Processing**: Translating single files at a time

## File Mode vs Folder Mode

This demo uses **file mode** where each language has separate files:
```
demo/source/
├── en.json     # English JSON
├── fr.json     # French JSON
├── en.xml      # English XML
├── fr.xml      # French XML
└── ...
```

For **folder mode** where files are organized by language directories, see `../demo-folder/`.

## Configuration

### Local AI (Ollama) Configuration
The demo is pre-configured for local AI translation using:
- **URL**: `http://localhost:11434/v1`
- **Model**: `qwen2.5:14b` (configurable)
- **API Key**: `ollama` (placeholder for local usage)

### Customizing the Model
You can modify the model in your `.env` file. Popular Ollama models for translation:
- `qwen2.5:14b` - High quality, slower (recommended)
- `qwen2.5:7b` - Good balance of speed and quality
- `qwen2.5:3b` - Fast, lower quality
- `gemma2:9b` - Alternative high-quality model
- `llama3.1:8b` - Another good alternative

### Engine Selection
You can modify the `demoEnv` object in `run-demo.js` to test different translation engines or change the `-e` parameter in the CLI commands.

## Troubleshooting

### Ollama Issues
- **Model not found**: Run `ollama pull qwen2.5:14b` to download the model
- **Connection refused**: Ensure Ollama is running with `ollama serve`
- **Slow translations**: Try a smaller model like `qwen2.5:7b`

### General Issues
- **Build errors**: Run `npm run build` in the root directory
- **Missing dependencies**: Run `npm install` in both root and demo directories
- **API key errors**: Verify your `.env` file configuration matches your chosen translation service
