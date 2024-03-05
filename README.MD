# About project

This project is used in, (and refactored from) excellent vs code extension
Auto Translate JSON
<https://marketplace.visualstudio.com/items?itemName=JeffJorczak.auto-translate-json>

It opens possibility to use Auto Translation JSON
not just in vs code but as a library and command line interface

You can use Azure,AWS,Google,DeepL,Open AI or
local OPEN AI compatible REST API
for example [jan](https://jan.ai/) local server
http://localhost:1337/v1
and model mistral-ins-7b-q4

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

if you clone repo you can use the following commands

```shell
npm i
npm run build
node .\build\src\index.js --pivotTranslation=./tests/translations/en.json
```

## CLI PARAMETERS

```config
mode,
file or folder,
default is file

startDelimiter,
start delimiter,
default is {

endDelimiter,
end delimiter,
default is }

keepExtraTranslations,
keep extra translations (not present in pivot translation),
default is keep,
it could be keep or remove

keepTranslations,
keep existing translations,
default is keep
it could be keep or retranslate

sourceLocale
source locale
it could be en or fr ...
if specified it must match with pivot translation

pivotTranslation
pivot translation file that will be used as source for translations

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

### Debug
 1. Create .env file in main folder with the desired key/keys from # ENVIRONMENT VARIABLES 
 2. Add also in .env  source locale "ATJ_SOURCE_LOCALE=en" to test from en
 3. npm run debug
