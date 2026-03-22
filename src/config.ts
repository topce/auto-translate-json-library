import type { InferenceProviderOrPolicy } from "@huggingface/inference";

export type Configuration = {
  translationKeyInfo:
    | GoogleTranslationKey
    | AwsTranslationKey
    | AzureTranslationKey
    | DeepLProTranslationKey
    | DeepLFreeTranslationKey
    | OpenAITranslationKey
    | HuggingFaceTranslationKey
    | HuggingFaceLocalTranslationKey;
  startDelimiter: string;
  endDelimiter: string;
  mode: "file" | "folder";
  sourceLocale: string;
  keepTranslations: "keep" | "retranslate";
  keepExtraTranslations: "keep" | "remove";
  ignorePrefix: string;
  format?: string;
};

type GoogleTranslationKey = { kind: "google"; apiKey: string };
type AwsTranslationKey = {
  kind: "aws";
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
};
type AzureTranslationKey = {
  kind: "azure";
  secretKey: string;
  region: string;
};
type DeepLProTranslationKey = {
  kind: "deepLPro";
  secretKey: string;
};

type DeepLFreeTranslationKey = {
  kind: "deepLFree";
  secretKey: string;
};

type OpenAITranslationKey = {
  kind: "openai";
  apiKey: string;
  baseUrl: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP: number;
  n: number;
  frequencyPenalty: number;
  presencePenalty: number;
};

type HuggingFaceTranslationKey = {
  kind: "huggingface";
  apiKey: string;
  model: string; // e.g. "Helsinki-NLP/opus-mt-en-fr"
  provider?: InferenceProviderOrPolicy;
};

type HuggingFaceLocalTranslationKey = {
  kind: "huggingface-local";
  model: string; // e.g. "Xenova/opus-mt-en-fr"
};
