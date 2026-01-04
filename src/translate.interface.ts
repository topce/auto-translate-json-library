export interface ITranslate {
  isValidLocale(targetLocale: string): boolean;
  translateText(
    text: string,
    sourceLocale: string,
    targetLocale: string,
    context?: string,
  ): Promise<string>;
}

export interface TranslationFile {
  [key: string]: any;
}
