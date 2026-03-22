# Auto Translate JSON Library

This project is used in, (and refactored from) excellent VS Code extension
Auto Translate JSON
<https://marketplace.visualstudio.com/items?itemName=JeffJorczak.auto-translate-json>

It opens possibility to use Auto Translation JSON
not just in VS Code but as a library and command line interface.

You can use Azure, AWS, Google, DeepL, OpenAI,
local OpenAI compatible REST API
for example [ollama](https://ollama.com/)
because it is compatible with OpenAI https://ollama.com/blog/openai-compatibility
or [Hugging Face](https://huggingface.co/) (cloud API or fully local on-device inference)

## 🚀 Version 2.0.0 - Major Release

This major release brings comprehensive improvements including:
- **ES Modules support** for modern JavaScript compatibility
- **Enhanced validation system** with detailed error reporting and recovery
- **Expanded format support** with robust handling for all major translation formats
- **Complete demo system** with interactive examples
- **Comprehensive test suite** with 100% format handler coverage
- **Security updates** for all dependencies

## ⚡ Version 2.1.0 - Performance & CLI Improvements

This release focuses on performance optimization and enhanced developer experience:

### 🚀 **Lazy Loading & Performance**
- **On-demand SDK loading** - Translation engines load only when needed
- **Reduced startup time** - Library imports in ~27ms instead of loading all SDKs
- **Lower memory footprint** - Only the selected provider's SDK loads into memory
- **Faster CLI response** - Help/version commands don't trigger heavy SDK loading

### 🤖 **LLM-Friendly CLI**
- **Structured JSON output** (`--json` flag) for automation and LLM consumption
- **Enhanced help system** with comprehensive examples and engine documentation
- **Improved error messages** with helpful tips and links
- **Better validation** with clear guidance for missing configuration

### 🛠️ **Developer Experience**
- **Updated CLI documentation** - All engines (huggingface, huggingface-local) documented
- **More examples** - 15+ comprehensive usage patterns
- **Local inference focus** - Better documentation for huggingface-local and Ollama
- **Performance metrics** in JSON output for monitoring and optimization

### 📊 **Key Performance Benefits**
- **Before**: All SDKs loaded at startup (~80MB+ memory)
- **After**: Only needed SDK loads on demand
- **Result**: 70% faster startup, 80% lower memory for most use cases

## Use as Library

```shell
npm i auto-translate-json-library
```

### Basic Usage

```typescript
import { translate, Configuration } from 'auto-translate-json-library';

const config: Configuration = {
  translationKeyInfo: {
    kind: 'google',
    apiKey: 'your-google-api-key'
  },
  sourceLocale: 'en',
  mode: 'file' // or 'folder'
};

const pivotTranslation = "./translations/en.json";
await translate(pivotTranslation, config);
// Creates translated files (e.g., fr.json, es.json) in the same directory
```

### Advanced Configuration

```typescript
import { translate, Configuration } from 'auto-translate-json-library';

const config: Configuration = {
  // Translation service configuration
  translationKeyInfo: {
    kind: 'openai', // 'google' | 'aws' | 'azure' | 'deepLPro' | 'deepLFree' | 'openai' | 'huggingface' | 'huggingface-local'
    apiKey: 'your-api-key',
    // OpenAI-specific options
    baseUrl: 'https://api.openai.com/v1', // or local Ollama: 'http://localhost:11434/v1'
    model: 'gpt-4', // or local model: 'qwen2.5:14b'
    maxTokens: 1000,
    temperature: 0.3
  },
  
  // Processing options
  sourceLocale: 'en',
  mode: 'folder', // Process entire folder structure
  format: 'auto', // Auto-detect or specify: 'json', 'xml', 'yaml', etc.
  
  // Translation behavior
  keepTranslations: 'keep', // 'keep' | 'retranslate'
  keepExtraTranslations: 'remove', // 'keep' | 'remove'
  
  // Delimiters for interpolation variables
  startDelimiter: '{{',
  endDelimiter: '}}',
  
  // Keys to ignore (e.g., metadata keys)
  ignorePrefix: '@@'
};

await translate('./translations/en.json', config);
```

### Translation Service Examples

#### Google Translate
```typescript
const config: Configuration = {
  translationKeyInfo: {
    kind: 'google',
    apiKey: process.env.GOOGLE_API_KEY
  },
  sourceLocale: 'en'
};
```

#### OpenAI (GPT-4.1 mini)
```typescript
const config: Configuration = {
  translationKeyInfo: {
    kind: 'openai',
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4.1-mini', // Best balance of quality and cost for translations
    maxTokens: 1000,
    temperature: 0.1 // Lower for more consistent translations
  },
  sourceLocale: 'en'
};
```

#### Local AI (Ollama)
```typescript
const config: Configuration = {
  translationKeyInfo: {
    kind: 'openai',
    apiKey: 'ollama', // Placeholder for local usage
    baseUrl: 'http://localhost:11434/v1',
    model: 'qwen2.5:14b', // Recommended model for high-quality translations
    maxTokens: 512
  },
  sourceLocale: 'en'
};
```

#### Hugging Face Cloud (Helsinki-NLP, NLLB, etc.)
```typescript
// Requires a free HF token: https://huggingface.co/settings/tokens
const config: Configuration = {
  translationKeyInfo: {
    kind: 'huggingface',
    apiKey: process.env.ATJ_HUGGING_FACE_API_KEY,
    model: 'Helsinki-NLP/opus-mt-en-fr',
    provider: 'hf-inference'
  },
  sourceLocale: 'en'
};
```

The cloud Hugging Face integration uses dedicated translation models such as `Helsinki-NLP/opus-mt-en-fr` and `facebook/nllb-200-distilled-600M`.

#### Hugging Face Local (No API key — fully on-device)
```typescript
// No account, no API key, no internet after first run
// Model (~300 MB) is downloaded and cached automatically on first use
const config: Configuration = {
  translationKeyInfo: {
    kind: 'huggingface-local',
    model: 'Xenova/opus-mt-en-fr' // ONNX version, runs on CPU/GPU via ONNX Runtime
  },
  sourceLocale: 'en'
};
```

#### AWS Translate
```typescript
const config: Configuration = {
  translationKeyInfo: {
    kind: 'aws',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: 'us-east-1'
  },
  sourceLocale: 'en'
};
```

#### Azure Translator
```typescript
const config: Configuration = {
  translationKeyInfo: {
    kind: 'azure',
    apiKey: process.env.AZURE_TRANSLATOR_KEY,
    region: 'eastus'
  },
  sourceLocale: 'en'
};
```

#### DeepL
```typescript
// DeepL Pro
const config: Configuration = {
  translationKeyInfo: {
    kind: 'deepLPro',
    apiKey: process.env.DEEPL_PRO_API_KEY
  },
  sourceLocale: 'en'
};

// DeepL Free
const configFree: Configuration = {
  translationKeyInfo: {
    kind: 'deepLFree',
    apiKey: process.env.DEEPL_FREE_API_KEY
  },
  sourceLocale: 'en'
};
```

## Use as Command Line Tool

First install it:

```shell
npm i auto-translate-json-library
```

### Global Installation (Recommended)

Install globally for easier access:

```shell
npm install -g auto-translate-json-library
```

Then use the convenient `atj` command:

## Publish to npm

The repo now uses npm trusted publishing from GitHub Actions instead of a long-lived `NPM_TOKEN`.

### One-time npm setup

1. Open the package settings on npm for `auto-translate-json-library`.
2. Enable trusted publishing for this GitHub repository.
3. Grant the workflow permission to publish from `topce/auto-translate-json-library`.

After that, GitHub Actions can publish with OIDC and `--provenance`, with no npm token stored in GitHub secrets.

### Release flow

1. Bump `version` in `package.json`.
2. Run `npm run release:check` locally.
3. Commit and push to `master`.
4. Create and push a version tag such as `v2.0.4`.

```shell
git tag v2.0.4
git push origin v2.0.4
```

The publish workflow will then:

- install with `npm ci`
- run tests
- build the package
- run `npm pack --dry-run`
- publish to npm with provenance

### Local dry run

If you want to inspect the package before tagging:

```shell
npm run release:check
```

This is the quickest way to catch missing files, broken builds, or packaging mistakes before a real publish.

```shell
atj translations/en.json -e google -s en
```

You can also use it with npx:

```shell
npx auto-translate-json-library translations/en.json -e google -s en
```

### CLI Examples with Modern Translation Services

#### Google Translate
```shell
# Single file translation
atj translations/en.json -e google -s en

# Folder translation (translates all supported files)
atj translations/ -e google -s en -m folder

# Specific format override
atj config/app.yaml -e google -s en --format yaml
```

#### OpenAI (GPT-4.1 mini/GPT-4o)
```shell
# Using GPT-4.1 mini for best balance of quality and cost (recommended)
atj translations/en.json -e openai -s en

# Using GPT-4o for higher quality translations
ATJ_OPEN_AI_MODEL=gpt-4o atj translations/en.json -e openai -s en

# Custom temperature for more creative translations
ATJ_OPEN_AI_TEMPERATURE=0.7 atj translations/en.json -e openai -s en
```

#### Local AI with Ollama
```shell
# Using Qwen2.5 model (recommended for high-quality translations)
ATJ_OPEN_AI_BASE_URL=http://localhost:11434/v1 \
ATJ_OPEN_AI_MODEL=qwen2.5:14b \
ATJ_OPEN_AI_SECRET_KEY=ollama \
atj translations/en.json -e openai -s en

# Alternative: Using smaller model for faster processing
ATJ_OPEN_AI_BASE_URL=http://localhost:11434/v1 \
ATJ_OPEN_AI_MODEL=qwen2.5:7b \
ATJ_OPEN_AI_SECRET_KEY=ollama \
atj translations/en.json -e openai -s en
```

#### AWS Translate
```shell
# Basic AWS translation
atj translations/en.json -e aws -s en

# Specify AWS region
ATJ_AWS_REGION=eu-west-1 atj translations/en.json -e aws -s en
```

#### Azure Translator
```shell
# Basic Azure translation
atj translations/en.json -e azure -s en

# Specify Azure region
ATJ_AZURE_REGION=westeurope atj translations/en.json -e azure -s en
```

#### DeepL
```shell
# DeepL Pro (higher quality, more languages)
atj translations/en.json -e deepLPro -s en

# DeepL Free (limited usage)
atj translations/en.json -e deepLFree -s en
```

#### Hugging Face Cloud
```shell
# Using Helsinki-NLP opus-mt model (fast, purpose-built for translation)
ATJ_HUGGING_FACE_API_KEY=hf_your_token \
atj translations/en.json -e huggingface -s en

# Different language pair model
ATJ_HUGGING_FACE_API_KEY=hf_your_token \
ATJ_HUGGING_FACE_MODEL=Helsinki-NLP/opus-mt-en-de \
atj translations/en.json -e huggingface -s en

# Using NLLB (supports 200+ languages)
ATJ_HUGGING_FACE_API_KEY=hf_your_token \
ATJ_HUGGING_FACE_MODEL=facebook/nllb-200-distilled-600M \
atj translations/en.json -e huggingface -s en
```

#### Hugging Face Local (No API key)
```shell
# Model downloads automatically on first run (~300 MB), then works offline
ATJ_HUGGING_FACE_LOCAL_MODEL=Xenova/opus-mt-en-fr \
atj translations/en.json -e huggingface-local -s en

# Different language pair
ATJ_HUGGING_FACE_LOCAL_MODEL=Xenova/opus-mt-en-de \
atj translations/en.json -e huggingface-local -s en
```

### File vs Folder Mode

#### File Mode (Default)
Translates a single file and creates translated versions in the same directory:

```shell
# Input: translations/en.json
# Output: translations/fr.json, translations/es.json, etc.
atj translations/en.json -e google -s en -m file
```

#### Folder Mode
Recursively processes all supported files in a directory structure:

```shell
# Processes all translation files in the folder tree
atj translations/ -e google -s en -m folder

# Example structure:
# translations/
# ├── en/
# │   ├── common.json
# │   ├── errors.yaml
# │   └── mobile.properties
# ├── fr/           # ← Created automatically
# │   ├── common.json
# │   ├── errors.yaml
# │   └── mobile.properties
# └── es/           # ← Created automatically
#     ├── common.json
#     ├── errors.yaml
#     └── mobile.properties
```

### New in 2.1.0: LLM-Friendly & Performance Features

#### JSON Output for Automation
```shell
# Structured JSON output for LLMs and automation
atj translations/en.json -e huggingface-local --json

# JSON output with Google Translate
atj translations/en.json -e google --json --format json

# Capture all logs and performance metrics
atj translations/en.json -e openai --json | jq '.performance.totalMs'
```

#### Lazy Loading in Action
```shell
# Only Hugging Face SDK loads (not Google, AWS, etc.)
atj translations/en.json -e huggingface-local

# Only OpenAI SDK loads on demand
atj translations/en.json -e openai

# Help command doesn't load any SDKs (fast response)
atj --help
```

#### Enhanced Error Messages & Help
```shell
# Get comprehensive help with all engines
atj --help

# List all supported formats
atj --list-formats

# Better error messages with helpful tips
ATJ_HUGGING_FACE_LOCAL_MODEL="" atj demo.json -e huggingface-local
```

### Format-Specific Examples

#### Android Development
```shell
# Android strings.xml files
atj res/values/strings.xml -e google -s en --format android-xml

# Folder mode for complete Android project
atj res/values/ -e google -s en -m folder --format android-xml
```

#### Flutter Development
```shell
# Flutter ARB files
atj lib/l10n/app_en.arb -e google -s en --format arb

# Process all ARB files in l10n folder
atj lib/l10n/ -e google -s en -m folder --format arb
```

#### Web Development
```shell
# JSON translation files
atj src/assets/i18n/en.json -e openai -s en

# YAML configuration files
atj config/locales/en.yaml -e google -s en --format yaml

# Properties files (Java/Spring)
atj src/main/resources/messages_en.properties -e aws -s en --format properties
```

#### Game Development
```shell
# CSV files for game localization
atj assets/localization/strings.csv -e deepLPro -s en --format csv

# XML-based game configs
atj data/strings/en.xml -e google -s en --format xml
```

Do not forget to set translation engine parameters in environment variables or .env file.

## Demo and Examples

The project includes a comprehensive demo system with examples for all supported formats and both translation modes:

### File Mode Demo (demo/)
Individual translation files - one file per language:
```shell
cd demo
npm install
node run-demo.js
```

### Folder Mode Demo (demo-folder/)
Language-organized directories - multiple files per language:
```shell
cd demo-folder
npm install
node run-demo.js
```

Both demos support:
- **Local AI translation** using Ollama (recommended for testing)
- **Cloud translation services** (Google, OpenAI, AWS, Azure, DeepL)
- **All supported formats** (JSON, XML, YAML, Properties, ARB, PO, CSV)
- **Interactive examples** with real translation results

Choose the demo that matches your project structure:
- **File mode**: Simple projects with one file per language (`en.json`, `fr.json`)
- **Folder mode**: Complex projects with multiple files per language (`en/common.json`, `fr/common.json`)

This will run translations on sample files in multiple formats (JSON, XML, YAML, ARB, PO, Properties, CSV) using the local Ollama setup with the `qwen2.5:14b` model and show the results.

## Contribute

Clone repo and use the following commands:

1. Install ollama and run `ollama run llama2`
2. Rename `ollama.env` to `.env`
3. Install dependencies and build project:

```shell
npm i
npm run build
node ./build/src/index.js --pivotTranslation=./tests/translations/en.json
```

After some time you should see es.json file with translation.

### Development Workflow

```shell
# Install dependencies
npm install

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint and format code
npm run lint
npm run format-fix

# Build project
npm run build

# Run demo (file mode)
cd demo && node run-demo.js

# Run demo (folder mode)
cd demo-folder && node run-demo.js
```

## Multi-Format Support

This tool supports a comprehensive range of translation file formats with automatic format detection and validation.

### Supported Formats Overview

| Format | Extension | Use Case | Auto-Detection |
|--------|-----------|----------|----------------|
| **JSON** | `.json` | Web apps, React, Vue, Angular | ✅ |
| **ARB** | `.arb` | Flutter applications | ✅ |
| **Android XML** | `.xml` | Android apps (strings.xml) | ✅ |
| **iOS XML** | `.xml` | iOS apps (plist format) | ✅ |
| **Generic XML** | `.xml` | Custom XML structures | ✅ |
| **XLIFF** | `.xlf`, `.xliff` | Translation exchange | ✅ |
| **XMB/XTB** | `.xmb`, `.xtb` | Google i18n format | ✅ |
| **GNU gettext** | `.po`, `.pot` | Linux/Unix applications | ✅ |
| **YAML** | `.yaml`, `.yml` | Configuration files | ✅ |
| **Properties** | `.properties` | Java applications | ✅ |
| **CSV** | `.csv` | Spreadsheet-based | ✅ |
| **TSV** | `.tsv` | Tab-separated values | ✅ |

### Format Detection

The tool automatically detects file formats using:
1. **File extension** (primary method)
2. **Content analysis** (fallback for ambiguous cases)
3. **Manual override** using `--format` parameter

```shell
# Auto-detection (recommended)
atj translations/messages.json -e google

# Manual format override
atj translations/data.txt --format json -e google

# List all supported formats
atj --list-formats
```

### Detailed Format Support

#### JSON-based Formats

**Standard JSON**
```json
{
  "welcome": "Welcome to our app",
  "user": {
    "name": "Name",
    "email": "Email address"
  }
}
```

**Flutter ARB (Application Resource Bundle)**
```json
{
  "@@locale": "en",
  "welcome": "Welcome to our app",
  "@welcome": {
    "description": "Welcome message for new users"
  },
  "userCount": "{count, plural, =0{No users} =1{One user} other{{count} users}}",
  "@userCount": {
    "description": "Number of users",
    "placeholders": {
      "count": {
        "type": "int"
      }
    }
  }
}
```

#### XML-based Formats

**Android strings.xml**
```xml
<resources xmlns:android="http://schemas.android.com/apk/res/android">
  <string name="app_name">My App</string>
  <string name="welcome">Welcome</string>
  <string name="not_translatable" translatable="false">DEBUG_MODE</string>
  
  <!-- Resource groups -->
  <group name="errors">
    <string name="network_error">Network connection failed</string>
    <string name="validation_error">Please check your input</string>
  </group>
  
  <!-- CDATA sections preserved -->
  <string name="formatted_text"><![CDATA[This is <b>bold</b> text]]></string>
</resources>
```

**iOS plist XML**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>app_name</key>
    <string>My iOS App</string>
    <key>welcome_message</key>
    <string>Welcome to iOS!</string>
</dict>
</plist>
```

**Generic XML (Auto-flattened)**
```xml
<?xml version="1.0" encoding="UTF-8"?>
<translations>
    <messages>
        <greeting>Hello World</greeting>
        <farewell>Goodbye</farewell>
    </messages>
    <labels>
        <submit>Submit</submit>
        <cancel>Cancel</cancel>
    </labels>
</translations>
```
*Becomes: `messages.greeting: "Hello World"`, `labels.submit: "Submit"`*

#### Text-based Formats

**GNU gettext PO files**
```po
# Comment preserved
msgid "hello"
msgstr "Hello"

msgid "goodbye"
msgstr "Goodbye"

# Plural forms supported
msgid "item"
msgid_plural "items"
msgstr[0] "item"
msgstr[1] "items"
```

**YAML translation files**
```yaml
# Comments preserved
greetings:
  hello: "Hello"
  goodbye: "Goodbye"
navigation:
  home: "Home"
  about: "About"
  # Nested structures supported
  menu:
    file: "File"
    edit: "Edit"
```

**Java Properties files**
```properties
# Application messages
app.title=My Application
app.welcome=Welcome to our application

# Unicode escaping supported
app.copyright=© 2024 My Company

# Placeholders preserved
user.greeting=Hello, {0}!
```

#### Tabular Formats

**CSV files**
```csv
key,en,fr,es
welcome,"Welcome","Bienvenue","Bienvenido"
goodbye,"Goodbye","Au revoir","Adiós"
```

**TSV files**
```tsv
key	en	fr	es
welcome	Welcome	Bienvenue	Bienvenido
goodbye	Goodbye	Au revoir	Adiós
```

### Format-Specific Features

#### XML Formats
- **Preserve attributes**: `translatable="false"`, namespaces
- **Maintain structure**: Comments, CDATA sections, processing instructions
- **Android support**: Resource groups, plurals, string arrays
- **iOS support**: Plist dictionary structure with key-value pairs
- **Generic XML**: Automatic structure flattening for any XML format
- **Validation**: Robust malformed XML detection and error reporting

#### XLIFF Support
- **Version compatibility**: XLIFF 1.2 and 2.x support
- **Translation states**: Maintain workflow information (new, translated, approved)
- **Metadata preservation**: Notes, comments, and translation metadata
- **Segmentation**: Support for complex translation units

#### GNU gettext (PO/POT)
- **Plural forms**: Complete plural form handling for all languages
- **Context support**: msgctxt for disambiguation
- **Comments**: Preserve translator and extracted comments
- **Fuzzy translations**: Handle fuzzy markers appropriately

#### ARB (Flutter)
- **ICU message format**: Complete support for plurals, selects, and formatting
- **Metadata preservation**: Descriptions, placeholders, and examples
- **Locale inheritance**: Proper locale fallback handling

#### Properties Files
- **Unicode escaping**: Automatic handling of Unicode characters
- **Different encodings**: Support for various character encodings
- **Placeholder preservation**: Maintain {0}, {1} style placeholders

#### CSV/TSV Files
- **Configurable columns**: Flexible column mapping and headers
- **Multi-language support**: Handle multiple target languages in one file
- **Encoding detection**: Automatic character encoding detection
- **Quoted fields**: Proper handling of quoted and escaped content

### Usage Examples by Format

```shell
# JSON files (auto-detected)
atj translations/en.json -e google

# Android strings.xml
atj res/values/strings.xml -e aws --format android-xml

# Flutter ARB files
atj lib/l10n/app_en.arb -e azure --format arb

# XLIFF files
atj locales/messages.xlf -e deepLPro --format xliff

# GNU gettext PO files
atj locales/messages.po -e openai --format po

# YAML files
atj config/translations.yaml -e google --format yaml

# Properties files
atj messages_en.properties -e aws --format properties

# CSV files with custom structure
atj data/translations.csv -e google --format csv

# List all supported formats
atj --list-formats
```

## Translation Service Setup Guides

The library supports multiple translation services. Choose the one that best fits your needs and follow the setup guide below.

### 🌐 Google Translate (Recommended for General Use)

**Best for**: High-quality translations, wide language support, reliable service

#### Setup Steps:
1. **Create Google Cloud Project**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the Cloud Translation API

2. **Get API Key**:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "API Key"
   - Copy your API key

3. **Configure Environment**:
   ```bash
   # Copy the Google environment template
   cp google.env .env
   
   # Edit .env and replace your_google_api_key_here with your actual API key
   ```

4. **Usage**:
   ```bash
   atj translations/en.json -e google -s en
   ```

#### Pricing:
- $20 per 1M characters
- Free tier: $300 credit for new users

---

### 🤖 OpenAI (Best for Context-Aware Translations)

**Best for**: Context-aware translations, technical content, creative translations

#### Setup Steps:
1. **Get OpenAI API Key**:
   - Go to [OpenAI Platform](https://platform.openai.com/)
   - Create account and add billing information
   - Go to API Keys section and create new key

2. **Configure Environment**:
   ```bash
   # Copy the OpenAI environment template
   cp openai.env .env
   
   # Edit .env and replace your_openai_api_key_here with your actual API key
   ```

3. **Usage**:
   ```bash
   # Using GPT-4.1 mini (best balance of quality and cost - recommended)
   atj translations/en.json -e openai -s en
   
   # Using GPT-4o (higher quality, moderate cost)
   ATJ_OPEN_AI_MODEL=gpt-4o atj translations/en.json -e openai -s en
   ```

#### Model Recommendations for Translation:
- **GPT-4.1 mini**: Best balance of quality and cost (recommended for most translations)
- **GPT-4o mini**: Good quality, very cost-effective (legacy but still available)
- **GPT-4.1**: Higher quality for complex translations, more expensive
- **GPT-4o**: Excellent multimodal capabilities, moderate cost

#### Pricing (Approximate):
- GPT-4.1 mini: ~$0.15/1M input tokens, ~$0.60/1M output tokens (most cost-effective)
- GPT-4o mini: ~$0.15/1M input tokens, ~$0.60/1M output tokens
- GPT-4.1: ~$2.00/1M input tokens, ~$8.00/1M output tokens
- GPT-4o: ~$2.50/1M input tokens, ~$10.00/1M output tokens

---

### 🏠 Local AI with Ollama (Free & Private)

**Best for**: Privacy-sensitive projects, offline usage, no API costs

#### Setup Steps:
1. **Install Ollama**:
   ```bash
   # macOS
   brew install ollama
   
   # Linux
   curl -fsSL https://ollama.com/install.sh | sh
   
   # Windows: Download from https://ollama.com/
   ```

2. **Download Model**:
   ```bash
   # High-quality model (recommended)
   ollama pull qwen2.5:14b
   
   # Faster alternative
   ollama pull qwen2.5:7b
   ```

3. **Start Ollama**:
   ```bash
   ollama serve
   ```

4. **Configure Environment**:
   ```bash
   # Copy the Ollama environment template
   cp ollama.env .env
   ```

5. **Usage**:
   ```bash
   atj translations/en.json -e openai -s en
   ```

#### Model Recommendations:
- **qwen2.5:14b**: Best quality (8GB RAM required)
- **qwen2.5:7b**: Good balance (4GB RAM required)
- **qwen2.5:3b**: Fastest (2GB RAM required)

---

### ☁️ AWS Translate (Best for AWS Ecosystem)

**Best for**: AWS-integrated projects, enterprise use, batch processing

#### Setup Steps:
1. **Create AWS Account**:
   - Go to [AWS Console](https://aws.amazon.com/)
   - Create account or sign in

2. **Create IAM User**:
   - Go to IAM > Users > Create User
   - Attach policy: `TranslateFullAccess`
   - Create access key for programmatic access

3. **Configure Environment**:
   ```bash
   # Copy the AWS environment template
   cp aws.env .env
   
   # Edit .env and replace with your actual AWS credentials
   ```

4. **Usage**:
   ```bash
   atj translations/en.json -e aws -s en
   ```

#### Pricing:
- $15 per 1M characters
- Free tier: 2M characters per month for 12 months

---

### 🔷 Azure Translator (Best for Microsoft Ecosystem)

**Best for**: Microsoft-integrated projects, enterprise use, custom models

#### Setup Steps:
1. **Create Azure Account**:
   - Go to [Azure Portal](https://portal.azure.com/)
   - Create account or sign in

2. **Create Translator Resource**:
   - Search for "Translator" in Azure Portal
   - Create new Translator resource
   - Choose pricing tier and region
   - Get key and endpoint from resource

3. **Configure Environment**:
   ```bash
   # Copy the Azure environment template
   cp azure.env .env
   
   # Edit .env and replace with your actual Azure credentials
   ```

4. **Usage**:
   ```bash
   atj translations/en.json -e azure -s en
   ```

#### Pricing:
- Standard: $10 per 1M characters
- Free tier: 2M characters per month

---

### 🎯 DeepL (Best Translation Quality)

**Best for**: Highest quality translations, European languages, professional content

#### Setup Steps:
1. **Create DeepL Account**:
   - Go to [DeepL Pro](https://www.deepl.com/pro) or [DeepL API Free](https://www.deepl.com/pro#developer)
   - Choose Pro (paid) or Free plan
   - Get your API key from account settings

2. **Configure Environment**:
   ```bash
   # Copy the DeepL environment template
   cp deepl.env .env
   
   # Edit .env and replace with your actual DeepL API key
   # Use either Pro or Free key (uncomment the appropriate line)
   ```

3. **Usage**:
   ```bash
   # DeepL Pro
   atj translations/en.json -e deepLPro -s en
   
   # DeepL Free
   atj translations/en.json -e deepLFree -s en
   ```

#### Pricing:
- **DeepL Pro**: €5.99/month + €20 per 1M characters
- **DeepL API Free**: 500,000 characters/month free

---

### 🤗 Hugging Face Cloud (Best Free Translation Models)

**Best for**: High-quality translations using purpose-built models, free tier available, 200+ languages with NLLB

#### Setup Steps:
1. **Create a Hugging Face Account**:
   - Go to [huggingface.co](https://huggingface.co/) and sign up (free)

2. **Get an Access Token**:
   - Go to [Settings → Access Tokens](https://huggingface.co/settings/tokens)
   - Click "New token", choose "Read" role, copy the token

3. **Configure Environment**:
   ```bash
   # Copy the HuggingFace environment template
   cp huggingface.env .env

   # Edit .env and replace your_huggingface_token_here with your actual token
   ```

4. **Usage**:
   ```bash
   atj translations/en.json -e huggingface -s en
   ```

#### Quick Run Commands:
```bash
# Use the default cloud example model
cp huggingface.env .env
atj translations/en.json -e huggingface -s en

# Override the model for another language pair
ATJ_HUGGING_FACE_API_KEY=hf_your_token \
ATJ_HUGGING_FACE_MODEL=Helsinki-NLP/opus-mt-en-de \
atj translations/en.json -e huggingface -s en

# Use NLLB for broader language coverage
ATJ_HUGGING_FACE_API_KEY=hf_your_token \
ATJ_HUGGING_FACE_MODEL=facebook/nllb-200-distilled-600M \
atj translations/en.json -e huggingface -s en
```

#### Recommended Models:
- **`Helsinki-NLP/opus-mt-en-fr`** — Fast, lightweight, English→French (swap `fr` for other languages)
- **`Helsinki-NLP/opus-mt-en-de`** — English→German
- **`facebook/nllb-200-distilled-600M`** — 200+ languages, one model for all pairs
- **`facebook/nllb-200-1.3B`** — Higher quality, 200+ languages

Browse all Helsinki-NLP models: [huggingface.co/Helsinki-NLP](https://huggingface.co/Helsinki-NLP)

#### Pricing:
- **Free tier**: Rate-limited but sufficient for development
- **PRO**: $9/month for higher rate limits
- **Inference Endpoints**: Pay-per-use for production workloads

---

### 🏠 Hugging Face Local (Free, Private, No API Key)

**Best for**: Complete privacy, offline usage, zero cost, no rate limits — using the same purpose-built translation models as the cloud mode but running entirely on your machine via ONNX Runtime.

> This is analogous to Ollama but uses dedicated translation models instead of general LLMs — typically faster and more accurate for translation tasks.

#### Setup Steps:
1. **No account or API key needed** — just configure the model name

2. **Configure Environment**:
   ```bash
   # Copy the local HuggingFace environment template
   cp huggingface-local.env .env
   ```

3. **Run** — the model downloads automatically on first use:
   ```bash
   atj translations/en.json -e huggingface-local -s en
   ```
   First run downloads the model (~300 MB) and caches it locally. All subsequent runs are fully offline.

#### Quick Run Commands:
```bash
# Use the default local example model
cp huggingface-local.env .env
atj translations/en.json -e huggingface-local -s en

# Use another local translation model
ATJ_HUGGING_FACE_LOCAL_MODEL=Xenova/opus-mt-en-de \
atj translations/en.json -e huggingface-local -s en

# Use a larger multilingual local model
ATJ_HUGGING_FACE_LOCAL_MODEL=Xenova/nllb-200-distilled-600M \
atj translations/en.json -e huggingface-local -s en
```

#### Recommended ONNX Models (from [huggingface.co/Xenova](https://huggingface.co/Xenova)):
- **`Xenova/opus-mt-en-fr`** — English→French (~300 MB)
- **`Xenova/opus-mt-en-de`** — English→German (~300 MB)
- **`Xenova/opus-mt-en-es`** — English→Spanish (~300 MB)
- **`Xenova/nllb-200-distilled-600M`** — 200+ languages, one model (~1.2 GB)

#### Pricing:
- **Completely free**, forever — no account, no limits, no internet after first run

---

## Service Comparison

| Service | Quality | Speed | Cost | Languages | Best For |
|---------|---------|-------|------|-----------|----------|
| **Google** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 100+ | General use, reliability |
| **OpenAI** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 50+ | Context-aware, technical |
| **Ollama** | ⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐⭐ | 30+ | Privacy, offline, free |
| **AWS** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 75+ | AWS ecosystem |
| **Azure** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 90+ | Microsoft ecosystem |
| **DeepL** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ | 30+ | Highest quality |
| **HuggingFace** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 200+ | Free tier, many models |
| **HuggingFace Local** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 200+ | Offline, private, free |

## Quick Start Examples

### For Web Development
```bash
# React/Vue/Angular projects with Google Translate
cp google.env .env
atj src/locales/en.json -e google -s en
```

### For Mobile Development
```bash
# Flutter with DeepL for high quality
cp deepl.env .env
atj lib/l10n/app_en.arb -e deepLPro -s en --format arb

# Android with AWS
cp aws.env .env
atj res/values/strings.xml -e aws -s en --format android-xml
```

### For Enterprise/Privacy
```bash
# Local AI for sensitive content
cp ollama.env .env
ollama pull qwen2.5:14b
ollama serve
atj translations/en.json -e openai -s en
```

### For High-Quality Content
```bash
# OpenAI GPT-4 for technical documentation
cp openai.env .env
atj docs/en.yaml -e openai -s en --format yaml
```

## CLI Parameters Reference

### Basic Parameters

| Parameter | Short | Description | Default | Example |
|-----------|-------|-------------|---------|---------|
| `--pivotTranslation` | | Source translation file/folder path | Required | `./translations/en.json` |
| `--mode` | `-m` | Processing mode: `file` or `folder` | `file` | `-m folder` |
| `--engine` | `-e` | Translation engine | `aws` | `-e google` |
| `--sourceLocale` | `-s` | Source language code | `en` | `-s en` |
| `--format` | `-f` | Force specific format | `auto-detect` | `--format yaml` |
| `--help` | `-h` | Show help message | | `-h` |
| `--list-formats` | | List all supported formats | | `--list-formats` |

### Advanced Parameters

| Parameter | Description | Values | Default |
|-----------|-------------|--------|---------|
| `--keepTranslations` | Handle existing translations | `keep`, `retranslate` | `keep` |
| `--keepExtraTranslations` | Handle extra keys not in source | `keep`, `remove` | `remove` |
| `--startDelimiter` | Variable start delimiter | Any string | `{` |
| `--endDelimiter` | Variable end delimiter | Any string | `}` |
| `--ignorePrefix` | Skip keys starting with prefix | Any string | (none) |

### Translation Engines

| Engine | Parameter Value | Description | API Required |
|--------|----------------|-------------|--------------|
| **Google Translate** | `google` | Google Cloud Translation API | Google API Key |
| **AWS Translate** | `aws` | Amazon Translate service | AWS credentials |
| **Azure Translator** | `azure` | Microsoft Translator service | Azure key + region |
| **DeepL Pro** | `deepLPro` | DeepL Pro API (higher limits) | DeepL Pro API key |
| **DeepL Free** | `deepLFree` | DeepL Free API (limited) | DeepL Free API key |
| **OpenAI** | `openai` | GPT models for translation | OpenAI API key |
| **Hugging Face Cloud** | `huggingface` | HF Inference API (Helsinki-NLP, NLLB…) | HF Access Token |
| **Hugging Face Local** | `huggingface-local` | On-device ONNX inference, no internet | None |

### Environment Variables

#### Google Translate
```bash
ATJ_GOOGLE_API_KEY=your_google_api_key_here
```

#### AWS Translate
```bash
ATJ_AWS_ACCESS_KEY_ID=your_aws_access_key
ATJ_AWS_SECRET_ACCESS_KEY=your_aws_secret_key
ATJ_AWS_REGION=us-east-1
```

#### Azure Translator
```bash
ATJ_AZURE_SECRET_KEY=your_azure_translator_key
ATJ_AZURE_REGION=eastus
```

#### DeepL
```bash
# DeepL Pro
ATJ_DEEPL_PRO_SECRET_KEY=your_deepl_pro_key

# DeepL Free
ATJ_DEEPL_FREE_SECRET_KEY=your_deepl_free_key
```

#### OpenAI / Local AI
```bash
# OpenAI (GPT-4.1 mini, GPT-4o, GPT-4.1)
ATJ_OPEN_AI_SECRET_KEY=your_openai_api_key
ATJ_OPEN_AI_BASE_URL=https://api.openai.com/v1
ATJ_OPEN_AI_MODEL=gpt-4.1-mini
ATJ_OPEN_AI_MAX_TOKENS=1000
ATJ_OPEN_AI_TEMPERATURE=0.1
ATJ_OPEN_AI_TOP_P=1.0
ATJ_OPEN_AI_N=1
ATJ_OPEN_AI_FREQUENCY_PENALTY=0
ATJ_OPEN_AI_PRESENCE_PENALTY=0

# Local AI (Ollama, Jan.ai, etc.)
ATJ_OPEN_AI_SECRET_KEY=ollama
ATJ_OPEN_AI_BASE_URL=http://localhost:11434/v1
ATJ_OPEN_AI_MODEL=qwen2.5:14b
ATJ_OPEN_AI_MAX_TOKENS=512
ATJ_OPEN_AI_TEMPERATURE=0.3
```

#### Hugging Face Cloud
```bash
# Requires a free HF token: https://huggingface.co/settings/tokens
ATJ_HUGGING_FACE_API_KEY=your_huggingface_token_here
# Optional explicit provider when model auto-selection does not work
ATJ_HUGGING_FACE_PROVIDER=hf-inference
# Model to use
ATJ_HUGGING_FACE_MODEL=Helsinki-NLP/opus-mt-en-fr
```

Run it with:

```bash
atj translations/en.json -e huggingface -s en
```

#### Hugging Face Local (no API key needed)
```bash
# ONNX model ID — downloaded and cached on first run (~300 MB)
# Find models at: https://huggingface.co/Xenova
ATJ_HUGGING_FACE_LOCAL_MODEL=Xenova/opus-mt-en-fr
```

Run it with:

```bash
atj translations/en.json -e huggingface-local -s en
```

#### Other Configuration
```bash
# Processing options
ATJ_START_DELIMITER={{
ATJ_END_DELIMITER=}}
ATJ_MODE=file
ATJ_SOURCE_LOCALE=en
ATJ_KEEP_TRANSLATIONS=keep
ATJ_KEEP_EXTRA_TRANSLATIONS=remove
ATJ_IGNORE_PREFIX=@@
```

### Complete CLI Examples

#### Basic Usage
```shell
# Translate single JSON file with Google
atj translations/en.json -e google -s en

# Translate folder structure with AWS
atj translations/ -e aws -s en -m folder

# Force YAML format detection
atj config/app.txt --format yaml -e azure -s en
```

#### Advanced Usage
```shell
# Retranslate existing files, keep extra keys
atj translations/en.json -e openai -s en \
  --keepTranslations retranslate \
  --keepExtraTranslations keep

# Custom delimiters for Vue.js i18n
atj src/locales/en.json -e google -s en \
  --startDelimiter "{{" \
  --endDelimiter "}}"

# Ignore metadata keys starting with @@
atj lib/l10n/app_en.arb -e deepLPro -s en \
  --ignorePrefix "@@"
```

#### Production Workflows
```shell
# Android app localization
atj res/values/strings.xml -e google -s en \
  --format android-xml \
  --keepTranslations keep

# Flutter app with ARB files
atj lib/l10n/ -e azure -s en -m folder \
  --format arb \
  --keepExtraTranslations remove

# Web app with nested JSON structure
atj src/assets/i18n/en.json -e openai -s en \
  --keepTranslations retranslate \
  --startDelimiter "{" \
  --endDelimiter "}"

# Game localization with CSV
atj assets/localization/strings.csv -e deepLPro -s en \
  --format csv \
  --keepTranslations keep
```

You can also use .env file to store environment variables for easier configuration management.

## Recent Improvements

### Version 2.0.0 - Major Release (2025-01-04)

This major release represents a complete rewrite and enhancement of the library:

#### 🔄 **ES Modules Migration**
- Complete migration from CommonJS to ES modules
- Modern JavaScript compatibility with `"type": "module"`
- Updated import/export syntax throughout codebase

#### 🛡️ **Enhanced Validation System**
- New comprehensive validation framework with detailed error reporting
- Automatic error recovery and correction capabilities
- Format-specific validation rules and error messages
- Enhanced debugging and troubleshooting information

#### 🎯 **Demo System**
- **Dual demo modes**: File mode (`demo/`) and Folder mode (`demo-folder/`)
- Interactive examples with examples for all supported formats
- **Local AI integration** with Ollama for offline testing
- Automated reset and run scripts for easy testing
- Sample files demonstrating real-world usage patterns
- Quick start examples for new users
- **Comprehensive format coverage**: JSON, XML, YAML, Properties, ARB, PO, CSV

#### 🧪 **Comprehensive Testing**
- 100% test coverage for all format handlers
- Integration tests for CLI functionality
- Error handling and edge case testing
- Cross-format compatibility validation

#### 🔧 **Code Quality Improvements**
- Complete codebase formatting with Biome linter
- Enhanced TypeScript configurations and type safety
- Improved error handling and user feedback
- Optimized performance for large files

#### 🔒 **Security Updates**
- Updated all dependencies to latest secure versions
- Fixed security vulnerabilities in axios and jws
- Enhanced input validation and sanitization

### XML Handler Enhancements (v1.5.5)

The XML handler has been significantly improved with the following features:

- **Enhanced Format Detection**: Automatically detects Android, iOS, and generic XML formats even with attributes and namespaces
- **Improved Validation**: Robust validation that properly identifies invalid XML structures and provides specific error messages
- **Better Error Handling**: Detects malformed XML with unclosed tags and provides clear error messages
- **Generic XML Flattening**: Automatically flattens nested XML structures for easier translation (e.g., `<messages><greeting>Hello</greeting></messages>` becomes `messages.greeting: "Hello"`)
- **Attribute Preservation**: Maintains XML attributes like `translatable="false"` and namespace declarations
- **Round-trip Translation**: Ensures translated content can be serialized back to valid XML while preserving structure

### Supported XML Structures

1. **Android strings.xml**: Full support for resource groups, CDATA sections, and Android-specific attributes
2. **iOS plist XML**: Complete support for Apple's property list format with key-value pairs
3. **Generic XML**: Automatic structure detection and flattening for any XML translation format

### Debug and Development

1. Create .env file in main folder with the desired key/keys from **ENVIRONMENT VARIABLES** section
2. Add also in .env source locale `ATJ_SOURCE_LOCALE=en` to test from en
3. Run: `npm run debug`

### Testing

Run the comprehensive test suite:

```shell
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode (for development)
npm run test:watch
```

### Migration from v1.x to v2.0

If upgrading from version 1.x, please note:

1. **Node.js Requirements**: Ensure you're using a Node.js version that supports ES modules
2. **Import Syntax**: Update any custom integrations to use ES module import syntax
3. **API Changes**: Review the updated TypeScript definitions for any breaking changes
4. **Testing**: Thoroughly test your specific file formats and workflows with the new version

For detailed migration assistance, see the [CHANGELOG.md](CHANGELOG.md) file.
