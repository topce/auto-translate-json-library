# Auto Translate JSON Library - Folder Mode Demo

This folder contains a demonstration of the `auto-translate-json-library` capabilities using **folder mode** where translation files are organized by language directories instead of individual files.

## Folder Mode vs File Mode

### File Mode (original demo)
```
demo/source/
├── en.json
├── fr.json
├── en.xml
├── fr.xml
└── ...
```

### Folder Mode (this demo)
```
demo-folder/source/
├── en/
│   ├── common.json      # Basic greetings and messages
│   ├── ui.json          # UI components and buttons
│   ├── app.xml          # Android app strings
│   ├── errors.xml       # Error messages
│   ├── config.yaml      # Configuration labels
│   ├── messages.yaml    # System messages
│   ├── site.properties  # Site settings
│   ├── buttons.properties # Button labels
│   ├── app.arb          # Flutter app strings
│   ├── welcome.arb      # Welcome messages with placeholders
│   ├── main.po          # Main gettext strings
│   ├── user.po          # User-related strings
│   ├── content.csv      # Content translations
│   └── layout.csv       # Layout strings
└── fr/
    └── (same structure with French translations)
```

## Contents
- `source/en/`: English source files organized by functionality (common, ui, app, errors, etc.)
- `source/fr/`: French target files with the same structure (initially empty/template content)
- `run-demo.js`: Node.js script that runs folder-based translation for individual files
- `ollama.env`: Pre-configured environment variables for local Ollama setup (folder mode)
- `reset-translations.js`: Script to reset all French files in folder structure
- `README.md`: This comprehensive documentation

## Key Differences from File Mode

1. **Organization**: Files are organized in language-specific folders (`en/`, `fr/`)
2. **Structure**: Multiple files per language instead of single files
3. **Configuration**: `ATJ_MODE=folder` in environment variables
4. **CLI Usage**: Point to specific files within language directories with `-m folder` flag
5. **Scalability**: Better for large projects with many translation files per language

## Important: Correct Folder Mode Usage

**Folder mode requires specifying individual files, not directories:**

✅ **Correct:**
```bash
node cli.js -s en -e openai -f json -m folder source/en/common.json
```

❌ **Incorrect:**
```bash
node cli.js -s en -e openai -f json -m folder source
```

The CLI expects you to specify a file path within a language directory, and it will automatically find the corresponding file in other language directories.

## Prerequisites
- Node.js installed
- Valid API keys for translation engines or Ollama setup
- The project must be built (`npm run build` in the root)

## Setup for Local AI (Ollama) - Recommended

### 1. Install Ollama
Download and install Ollama from [https://ollama.com/](https://ollama.com/)

### 2. Download and Run the Required Model
```bash
# Pull the model
ollama pull qwen2.5:14b

# Start Ollama server
ollama serve

# Verify the model is available
ollama list
```

### 3. Configure Environment Variables
Copy the pre-configured Ollama environment file:

```bash
# From the demo-folder directory
cp ollama.env .env
```

The key difference is `ATJ_MODE=folder` which tells the library to use folder mode.

## How to Run

### Quick Start with Ollama
1. Follow the Ollama setup instructions above
2. Ensure Ollama is running: `ollama serve`
3. From the demo-folder directory: `cp ollama.env .env`
4. Install dependencies: `npm install`
5. Run the demo: `node run-demo.js`

### Specific Format Demos
```bash
# Run only JSON folder demo
node run-demo.js json

# Run only YAML folder demo
node run-demo.js yaml

# Run all formats in folder structure
node run-demo.js all
```

### Reset Translations
To reset all French translation files in folder structure:
```bash
node reset-translations.js
```

## What it demonstrates

The folder mode demo shows how to:

1. **Organize translations by language folders**: Each language has its own directory
2. **Maintain file structure**: The same file structure exists in each language folder
3. **Translate individual files**: Translate specific files within language directories
4. **Handle multiple formats**: JSON, XML, YAML, Properties, ARB, PO, and CSV files in folders
5. **Preserve organization**: Maintain the same file organization across languages
6. **Scale efficiently**: Manage large projects with many files per language

## Supported Formats Tested

✅ **All formats work perfectly in folder mode:**

- **JSON** - Basic translations and nested objects
- **Android XML** - App strings with proper XML structure
- **Flutter ARB** - App Resource Bundle with placeholder support
- **Gettext PO** - GNU gettext format with proper headers
- **YAML** - Configuration files with nested structure
- **Java Properties** - Key-value pairs with comments
- **CSV** - Tabular data with proper column handling

## Folder Structure Example

### English Source Files (`source/en/`)
- `common.json` - Common UI strings
- `ui.json` - UI-specific translations
- `app.xml` - Android app strings
- `errors.xml` - Error messages
- `config.yaml` - Configuration labels
- `messages.yaml` - System messages
- `site.properties` - Site settings
- `buttons.properties` - Button labels
- `app.arb` - Flutter app strings
- `welcome.arb` - Welcome messages
- `main.po` - Main gettext strings
- `user.po` - User-related strings
- `content.csv` - Content translations
- `layout.csv` - Layout strings

### French Target Files (`source/fr/`)
Same structure as English, but with French translations (initially empty).

## CLI Commands Used

The demo uses commands like:
```bash
# Translate specific JSON files in folder structure
node cli.js -s en -e openai -f json -m folder source/en/common.json
node cli.js -s en -e openai -f json -m folder source/en/ui.json

# Translate specific XML files in folder structure
node cli.js -s en -e openai -f android-xml -m folder source/en/app.xml
node cli.js -s en -e openai -f android-xml -m folder source/en/errors.xml

# Translate specific YAML files in folder structure
node cli.js -s en -e openai -f yaml -m folder source/en/config.yaml
node cli.js -s en -e openai -f yaml -m folder source/en/messages.yaml
```

**Note:** Each file must be specified individually. The CLI will automatically find the corresponding file in other language directories (e.g., `source/fr/common.json`).

## Benefits of Folder Mode

1. **Better Organization**: Logical grouping of related translations
2. **Scalability**: Easy to add new languages by creating new folders
3. **Maintainability**: Easier to manage large translation projects
4. **Team Collaboration**: Different team members can work on different file categories
5. **Modular Updates**: Update specific categories without affecting others

## Configuration

The key environment variable for folder mode:
```env
ATJ_MODE=folder
```

This tells the library to expect language folders instead of individual files.

## Troubleshooting

### Ollama Issues
- **Model not found**: Run `ollama pull qwen2.5:14b`
- **Connection refused**: Ensure Ollama is running with `ollama serve`
- **Slow translations**: Try a smaller model like `qwen2.5:7b`

### Folder Mode Issues
- **Wrong structure**: Ensure you have `source/en/` and `source/fr/` directories
- **Missing files**: Check that corresponding files exist in both language folders
- **Mode setting**: Verify `ATJ_MODE=folder` is set in your `.env` file