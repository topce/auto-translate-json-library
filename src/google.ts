import { Translate } from "@google-cloud/translate/build/src/v2";
import { ITranslate } from "./translate.interface";
import { Util } from "./util";

export class GoogleTranslate implements ITranslate {
  private constructor(
    private googleTranslate: Translate,
    private supportedLanguages: string[] = [],
  ) {}

  static async initialize(apiKey: string): Promise<GoogleTranslate> {
    const googleTranslate = new Translate({ key: apiKey });
    const supportedLanguages =
      await GoogleTranslate.getSupportedLanguages(googleTranslate);
    return new GoogleTranslate(googleTranslate, supportedLanguages);
  }

  private static async getSupportedLanguages(
    translate: Translate,
  ): Promise<string[]> {
    const [languages] = await translate.getLanguages();
    return languages.map((language, _index, _array) =>
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
