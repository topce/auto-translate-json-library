export type Configuration = {
  translationKeyInfo:
  | GoogleTranslationKey
  | AwsTranslationKey
  | AzureTranslationKey
  | DeepLProTranslationKey
  | DeepLFreeTranslationKey
  | OpenAITranslationKey;
  startDelimiter: string;
  endDelimiter: string;
  mode: 'file' | 'folder';
  sourceLocale: string;
  keepTranslations: 'keep' | 'retranslate';
  keepExtraTranslations: 'keep' | 'remove';
  ignorePrefix:string;
};

type GoogleTranslationKey = { kind: 'google'; apiKey: string };
type AwsTranslationKey = {
  kind: 'aws';
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};
type AzureTranslationKey = {
  kind: 'azure';
  secretKey: string;
  region: string;
};
type DeepLProTranslationKey = {
  kind: 'deepLPro';
  secretKey: string;
};

type DeepLFreeTranslationKey = {
  kind: 'deepLFree';
  secretKey: string;
};

type OpenAITranslationKey = { kind: 'openai'; apiKey: string };