import { ITranslate } from "./translate.interface";

//const {Translate} = require('@google-cloud/translate').v2;
import { Translate } from "@google-cloud/translate/build/src/v2";
import { Util } from "./util";

async function getSupportedLanguages(translate: Translate): Promise<string[]> {
  const [languages] = await translate.getLanguages();
  return languages.map((language, _index, _array) => language.code.toLowerCase());
}

export class GoogleTranslate implements ITranslate {
  private apikey: string;
  private googleTranslate: Translate;
  private supportedLanguages: string[] = [];

  constructor(apikey: string, googleTranslate?: Translate, supportedLanguages: string[] = []) {
    this.apikey = apikey;
    this.googleTranslate = googleTranslate ?? new Translate({ key: this.apikey });
    this.supportedLanguages = supportedLanguages;
  }

  static async initialize(apiKey: string): Promise<GoogleTranslate> {
    const googleTranslate = new Translate({ key: apiKey });
    const supportedLanguages = await getSupportedLanguages(googleTranslate);
    return new GoogleTranslate(apiKey, googleTranslate, supportedLanguages);
  }

  isValidLocale(targetLocale: string): boolean {
    return this.supportedLanguages.includes(targetLocale);
  }

  async translateText(
    text: string,
    _sourceLocale: string,
    targetLocale: string,
  ): Promise<string> {
    let args;
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
