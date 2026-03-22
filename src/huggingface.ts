import {
  InferenceClient,
  type InferenceProviderOrPolicy,
} from "@huggingface/inference";
import type { ITranslate } from "./translate.interface.js";
import { Util } from "./util.js";

const supportedLanguages: Record<string, string> = {
  en: "English",
  fr: "French",
  de: "German",
  es: "Spanish",
  it: "Italian",
  pt: "Portuguese",
  nl: "Dutch",
  pl: "Polish",
  cs: "Czech",
  sk: "Slovak",
  sl: "Slovenian",
  hr: "Croatian",
  hu: "Hungarian",
  ro: "Romanian",
  bg: "Bulgarian",
  el: "Greek",
  ru: "Russian",
  uk: "Ukrainian",
  tr: "Turkish",
  ar: "Arabic",
  he: "Hebrew",
  hi: "Hindi",
  th: "Thai",
  vi: "Vietnamese",
  id: "Indonesian",
  ms: "Malay",
  ja: "Japanese",
  ko: "Korean",
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
};

export class HuggingFaceTranslate implements ITranslate {
  private client: InferenceClient;

  constructor(
    apiKey: string,
    private model: string,
    private provider?: InferenceProviderOrPolicy,
  ) {
    this.client = new InferenceClient(apiKey);
  }

  isValidLocale(_targetLocale: string): boolean {
    // HF translation models support many locales; validation happens at runtime
    return true;
  }

  private getLanguageName(locale: string): string {
    return supportedLanguages[locale] ?? locale;
  }

  private sanitizeResult(
    result: string,
    args: RegExpMatchArray | null,
  ): string {
    const trimmedResult = result.replace(/^\n+|\n+$/g, "").trim();
    return Util.replaceArgumentsWithNumbers(args, trimmedResult);
  }

  async translateText(
    text: string,
    sourceLocale: string,
    targetLocale: string,
    _context?: string,
  ): Promise<string> {
    let args: RegExpMatchArray | null;
    ({ args, text } = Util.replaceContextVariables(text));

    const response = await this.client.translation({
      model: this.model,
      provider: this.provider,
      inputs: text,
      parameters: {
        src_lang: sourceLocale,
        tgt_lang: targetLocale,
      },
    });

    let result: string;
    if (Array.isArray(response)) {
      result = (response[0] as { translation_text: string }).translation_text;
    } else {
      result = (response as { translation_text: string }).translation_text;
    }

    return this.sanitizeResult(result, args);
  }
}
