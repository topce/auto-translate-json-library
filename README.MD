# Use as library

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

# Use as command line tool

first install it

```shell
npm i auto-translate-json-library
```

do not forget to set translation engine parameters in environment variables or .env file

```shell

```shell
node node_modules\auto-translate-json-library\index.js --pivotTranslation=./translations/en.json
```

if you clone repo  you can use the following command

```shell
npm start --pivotTranslation=./test/en.json
```

```	
# CLI PARAMETERS

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

You can also use .env file to store environment variables
