export interface ITranslate {
  isValidLocale(targetLocale: string): boolean;
  translateText(
    text: string,
    sourceLocale: string,
    targetLocale: string,
  ): Promise<string>;
}

export interface TranslationFile {
  // biome-ignore lint/suspicious/noExplicitAny: This interface is used for flexibility in translation files
  [key: string]: any;
}
