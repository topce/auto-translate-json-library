import type { ITranslate } from "./translate.interface";

import * as deepl from "deepl-node";

import { Util } from "./util";

const supportedLanguages = [
  "AR",
  "BG",
  "CS",
  "DA",
  "DE",
  "EL",
  "EN",
  "EN-GB",
  "EN-US",
  "EN",
  "ES",
  "ET",
  "FI",
  "FR",
  "HU",
  "ID",
  "IT",
  "JA",
  "LT",
  "LV",
  "NB",
  "NL",
  "PL",
  "PT",
  "PT-PT",
  "PT-BR",
  "PT",
  "RO",
  "RU",
  "SK",
  "SL",
  "SV",
  "TR",
  "UK",
  "ZH",
];

export class DeepLTranslate implements ITranslate {
  private endpoint = "https://api.deepl.com";
  constructor(
    private subscriptionKey: string,
    private type: "free" | "pro",
  ) {
    if (this.type === "free") {
      this.endpoint = "https://api-free.deepl.com";
    }
  }
  isValidLocale(targetLocale: string): boolean {
    return supportedLanguages.includes(targetLocale.toUpperCase());
  }
  async translateText(
    text: string,
    sourceLocale: string,
    targetLocale: string,
  ): Promise<string> {
    let args: RegExpMatchArray | null;
    ({ args, text } = Util.replaceContextVariables(text));

    let result = "";

    const translator = new deepl.Translator(this.subscriptionKey);
    const translation = await translator.translateText(
      text,
      sourceLocale as deepl.SourceLanguageCode,
      targetLocale as deepl.TargetLanguageCode,
    );

    result = translation.text;

    result = Util.replaceArgumentsWithNumbers(args, result);

    return result;
  }
}

// https://www.deepl.com/docs-api/translating-text/example/
