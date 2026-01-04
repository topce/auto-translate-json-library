import { v2 as translate } from "@google-cloud/translate";
import type { ITranslate } from "./translate.interface.js";
import { Util } from "./util.js";

export class GoogleTranslate implements ITranslate {
  private constructor(
    private googleTranslate: translate.Translate,
    private supportedLanguages: string[] = [],
  ) {}

  static async initialize(apiKey: string): Promise<GoogleTranslate> {
    const googleTranslate = new translate.Translate({ key: apiKey });
    const supportedLanguages =
      await GoogleTranslate.getSupportedLanguages(googleTranslate);
    return new GoogleTranslate(googleTranslate, supportedLanguages);
  }

  private static async getSupportedLanguages(
    translate: translate.Translate,
  ): Promise<string[]> {
    const [languages] = await translate.getLanguages();
    return languages.map((language: any, _index: number, _array: any[]) =>
      language.code.toLowerCase(),
    );
  }

  isValidLocale(targetLocale: string): boolean {
    return this.supportedLanguages.includes(targetLocale);
  }

  async translateText(
    text: string,
    _sourceLocale: string,
    targetLocale: string,
  ): Promise<string> {
    let args: RegExpMatchArray | null;
    ({ args, text } = Util.replaceContextVariables(text));

    let result = "";

    try {
      const response = await this.googleTranslate.translate(text, targetLocale);
      result = response[0];
    } catch (error) {
      if (error instanceof Error) {
        let message = error.message;
        if (error.message === "Invalid Value") {
          message = `Invalid Locale ${targetLocale}`;
        }
        console.error(message);
        return message;
      }
      return "error";
    }

    // replace arguments with numbers
    result = Util.replaceArgumentsWithNumbers(args, result);

    return result;
  }
}
