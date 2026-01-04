# About project

This project is used in, (and refactored from) excellent vs code extension
Auto Translate JSON
<https://marketplace.visualstudio.com/items?itemName=JeffJorczak.auto-translate-json>

It opens possibility to use Auto Translation JSON
not just in vs code but as a library and command line interface

You can use Azure,AWS,Google,DeepL,Open AI or
local OPEN AI compatible REST API
for example [ollama](https://ollama.com/) 
because it is compatible with Open AI https://ollama.com/blog/openai-compatibility :


## Use as library

```shell
npm i auto-translate-json-library
```

```Typescript
import { translate, Configuration } from 'auto-translate-json-library';

let config: Configuration = {} as Configuration;

// set google api key
config.translationKeyInfo = {
          kind: 'google',
          apiKey: googleApiKey
        };
const pivotTranslation="./en.json";
await translate(pivotTranslation, config) ;
// translation for example fr.json in same folder as pivotTranslation should contain the translations
```

## Use as command line tool

first install it

```shell
npm i auto-translate-json-library
```

do not forget to set translation engine parameters in environment variables or .env file

```shell
node node_modules\auto-translate-json-library\index.js --pivotTranslation=./translations/en.json
```

## Contribute

Clone repo you can use the following commands

install ollama 
run ollama run llama2
rename ollama.env to .env
install
build project
and run it

```shell
npm i
npm run build
node .\build\src\index.js --pivotTranslation=./tests/translations/en.json
```

After some time you should see es.json file with translation

## Multi-Format Support

This tool supports a wide range of translation file formats with automatic format detection:

### Supported Formats

**JSON-based formats:**
- `json` - Standard JSON translation files
- `arb` - Flutter Application Resource Bundle files

**XML-based formats:**
- `xml` - Generic XML translation files with automatic structure flattening
- `android-xml` - Android strings.xml format with resource groups and attributes
- `ios-xml` - iOS localization XML (plist) format
- `xliff` - XLIFF 1.2 and 2.x translation exchange files
- `xmb` - XML Message Bundle source files (Google)
- `xtb` - XML Translation Bundle files (Google)

**Text-based formats:**
- `po` - GNU gettext PO files
- `pot` - GNU gettext POT template files
- `yaml` - YAML translation files
- `properties` - Java Properties files

**Tabular formats:**
- `csv` - Comma-separated values files
- `tsv` - Tab-separated values files

### Format Detection

The tool automatically detects the file format based on:
1. File extension (primary method)
2. Content analysis (fallback)
3. Manual override using `--format` parameter

### Format Examples

**Android strings.xml:**
```xml
<resources xmlns:android="http://schemas.android.com/apk/res/android">
  <string name="hello">Hello</string>
  <string name="bye" translatable="false">Goodbye</string>
  <!-- Comments are preserved -->
  <string name="formatted"><![CDATA[This is <b>bold</b> text]]></string>
  <group name="errors">
    <string name="network_error">Network connection failed</string>
    <string name="validation_error">Please check your input</string>
  </group>
</resources>
```

**iOS plist XML:**
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

**Generic XML:**
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

**Flutter ARB file:**
```json
{
  "@@locale": "en",
  "hello": "Hello",
  "@hello": {
    "description": "Greeting message"
  }
}
```

**GNU gettext PO file:**
```po
msgid "hello"
msgstr "Hello"

msgid "goodbye"
msgstr "Goodbye"
```

**YAML translation file:**
```yaml
greetings:
  hello: "Hello"
  goodbye: "Goodbye"
navigation:
  home: "Home"
  about: "About"
```

### Format-Specific Features

- **XML formats**: 
  - Preserve attributes, comments, and CDATA sections
  - Android: Support resource groups and translatable attributes
  - iOS: Handle plist dictionary structure with key-value pairs
  - Generic: Automatic structure flattening (e.g., `messages.greeting`)
  - Robust validation and malformed XML detection
- **XLIFF**: Maintain translation states and workflow information
- **PO/POT**: Handle plural forms and context (msgctxt)
- **ARB**: Preserve ICU message format and metadata
- **YAML**: Support nested structures and preserve comments
- **Properties**: Handle Unicode escaping and different encodings
- **CSV/TSV**: Configurable column mapping and multi-language support

## CLI PARAMETERS

```config
mode, -m
file or folder,
default is file

engine, -e
translation engine (aws, azure, google, deepLPro, deepLFree, openai),
default is aws

sourceLocale, -s
source locale (en, fr, de, etc.),
default is en

format, -f
file format override (json, xml, xliff, po, yaml, etc.),
default is auto-detect

keepTranslations
keep existing translations,
default is keep
it could be keep or retranslate

keepExtraTranslations
keep extra translations (not present in pivot translation),
default is remove
it could be keep or remove

list-formats
list all supported file formats

help, -h
display help message

startDelimiter
start delimiter,
default is {

endDelimiter
end delimiter,
default is }

ignorePrefix 
ignore translation that key starts with ignore prefix

# ENVIRONMENT VARIABLES

google parameters
ATJ_GOOGLE_API_KEY=

aws parameters
ATJ_AWS_ACCESS_KEY_ID=
ATJ_AWS_SECRET_ACCESS_KEY=
ATJ_AWS_REGION=

azure parameters
ATJ_AZURE_SECRET_KEY=
ATJ_AZURE_REGION=

deepl pro parameters
ATJ_DEEPL_PRO_SECRET_KEY=
deepl free parameters
ATJ_DEEPL_FREE_SECRET_KEY=

OpenAI parameters 
ATJ_OPEN_AI_SECRET_KEY=
ATJ_OPEN_AI_BASE_URL= 
default value "https://api.openai.com/v1",
ATJ_OPEN_AI_MODEL 
default value gpt-3.5-turbo
ATJ_OPEN_AI_MAX_TOKENS 
default value 256
ATJ_OPEN_AI_TEMPERATURE 
default value 0
ATJ_OPEN_AI_TOP_P 
default value 1.0
ATJ_OPEN_AI_N 
default value 1
ATJ_OPEN_AI_FREQUENCY_PENALTY 
default value 0
ATJ_OPEN_AI_PRESENCE_PENALTY 
default value 0

Deepseek parameters 
similar to OpenAI but you need to
put your deepseek secret key 
ATJ_OPEN_AI_SECRET_KEY=sk-xxxxxx
and model
ATJ_OPEN_AI_MODEL=deepseek-chat
ATJ_OPEN_AI_BASE_URL=https://api.deepseek.com/v1
ATJ_OPEN_AI_TEMPERATURE=1.3


If you want to run it locally without using Open AI but compatible API 
you need to modify base URL and model for example 
if you use jan https://jan.ai/ you can modify base url model and maximum number of tokens (you do not pay for tokens anymore), secret key is not important 
ATJ_OPEN_AI_SECRET_KEY=whatever
ATJ_OPEN_AI_BASE_URL=http://localhost:1337/v1
ATJ_OPEN_AI_MODEL=mistral-ins-7b-q4
ATJ_OPEN_AI_MAX_TOKENS=4096


start delimiter
ATJ_START_DELIMITER={{
end delimiter
ATJ_END_DELIMITER=}}

file or folder
ATJ_MODE=file

source locale
ATJ_SOURCE_LOCALE=en

keep or retranslate existing translations
ATJ_KEEP_TRANSLATIONS=keep

keep or remove extra translations
ATJ_KEEP_EXTRA_TRANSLATIONS=keep

ignore prefix translation keys to ignore
ATJ_IGNORE_PREFIX=
```

You can also use .env file to store environment variables

There is also improved version of CLI (since version 1.3.2) for example:

```shell
npm install -g auto-translate-library
atj tests/translations/en.json -e google -m file
```

You can also use it with npx

```shell
npx auto-translate-library tests/translations/en.json -e google -m file
```

### Format-Specific Usage Examples

```shell
# JSON files (auto-detected)
atj translations/en.json -e google

# Android strings.xml
atj --format android-xml res/values/strings.xml -e aws

# Flutter ARB files
atj --format arb lib/l10n/app_en.arb -e azure

# XLIFF files
atj --format xliff locales/messages.xlf -e deepLPro

# GNU gettext PO files
atj --format po locales/messages.po -e openai

# YAML files
atj --format yaml config/translations.yaml -e google

# List all supported formats
atj --list-formats
```

## Recent Improvements

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

### Debug
 1. Create .env file in main folder with the desired key/keys from # ENVIRONMENT VARIABLES 
 2. Add also in .env  source locale "ATJ_SOURCE_LOCALE=en" to test from en
 3. npm run debug
