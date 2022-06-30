import { Configuration } from './config';
import { translate } from './lib';

export { Configuration, translate };

let config: Configuration = {} as Configuration;
require('dotenv').config();
if (process.env.ATJ_GOOGLE_API_KEY) {
  config.translationKeyInfo = {
    kind: 'google',
    apiKey: process.env.ATJ_GOOGLE_API_KEY,
  };
}
if (
  process.env.ATJ_AWS_ACCESS_KEY_ID &&
  process.env.ATJ_AWS_SECRET_ACCESS_KEY &&
  process.env.ATJ_AWS_REGION
) {
  config.translationKeyInfo = {
    kind: 'aws',
    accessKeyId: process.env.ATJ_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.ATJ_AWS_SECRET_ACCESS_KEY,
    region: process.env.ATJ_AWS_REGION,
  };
}
if (process.env.ATJ_AZURE_SECRET_KEY && process.env.ATJ_AZURE_REGION) {
  config.translationKeyInfo = {
    kind: 'azure',
    secretKey: process.env.ATJ_AZURE_SECRET_KEY,
    region: process.env.ATJ_AZURE_REGION,
  };
}

if (process.env.ATJ_DEEPL_PRO_SECRET_KEY) {
  config.translationKeyInfo = {
    kind: 'deepLPro',
    secretKey: process.env.ATJ_DEEPL_PRO_SECRET_KEY,
  };
}

if (process.env.ATJ_DEEPL_FREE_SECRET_KEY) {
  config.translationKeyInfo = {
    kind: 'deepLFree',
    secretKey: process.env.ATJ_DEEPL_FREE_SECRET_KEY,
  };
}

if (process.env.ATJ_START_DELIMITER) {
  config.startDelimiter = process.env.ATJ_START_DELIMITER;
}

if (process.env.ATJ_END_DELIMITER) {
  config.endDelimiter = process.env.ATJ_END_DELIMITER;
}

if (process.env.ATJ_END_DELIMITER) {
  config.endDelimiter = process.env.ATJ_END_DELIMITER;
}

if (
  process.env.ATJ_MODE &&
  (process.env.ATJ_MODE === 'file' || process.env.ATJ_MODE === 'folder')
) {
  config.mode = process.env.ATJ_MODE;
}

if (process.env.ATJ_SOURCE_LOCALE) {
  config.sourceLocale = process.env.ATJ_SOURCE_LOCALE;
}

if (
  process.env.ATJ_KEEP_TRANSLATIONS &&
  (process.env.ATJ_KEEP_TRANSLATIONS === 'keep' ||
    process.env.ATJ_KEEP_TRANSLATIONS === 'retranslate')
) {
  config.keepTranslations = process.env.ATJ_KEEP_TRANSLATIONS;
}

if (
  process.env.ATJ_KEEP_EXTRA_TRANSLATIONS &&
  (process.env.ATJ_KEEP_EXTRA_TRANSLATIONS === 'keep' ||
    process.env.ATJ_KEEP_EXTRA_TRANSLATIONS === 'remove')
) {
  config.keepExtraTranslations = process.env.ATJ_KEEP_EXTRA_TRANSLATIONS;
}

console.log(config);
var args = process.argv.slice(2);
console.log(args);
console.log(__dirname);

console.log(process.cwd()); 
if (args.length > 0) {
   translate(args[0], config);
}