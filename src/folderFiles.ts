import * as fs from "node:fs";
import * as path from "node:path";
import { type IFiles, loadJsonFromLocale, saveJsonToLocale } from "./files";
import type { TranslationFile } from "./translate.interface";

export class FolderFiles implements IFiles {
  folderPath: string;
  sourceLocale: string;
  targetLocales: Array<string>;
  fileName: string;

  constructor(filePath: string) {
    const localeDir = path.dirname(filePath);
    this.folderPath = path.dirname(localeDir);
    this.fileName = path.basename(filePath);
    this.sourceLocale = path.basename(localeDir);
    this.targetLocales = this.getTargetLocales();

    console.log(
      this.folderPath,
      this.fileName,
      this.sourceLocale,
      this.targetLocales,
    );
  }

  private getTargetLocales(): string[] {
    const files = fs
      .readdirSync(this.folderPath)
      .map((folder, _index, _array) => path.basename(folder))
      .map((locale, _index, _array) =>
        locale !== this.sourceLocale ? locale : "",
      )
      .filter((x, _index, _array) => x); // do not want empty strings

    return files;
  }

  private createFileName(locale: string): string {
    return `${this.folderPath}/${locale}/${this.fileName}`;
  }

  loadJsonFromLocale(locale: string) {
    return loadJsonFromLocale(this.createFileName(locale));
  }

  saveJsonToLocale(locale: string, file: TranslationFile) {
    saveJsonToLocale(this.createFileName(locale), file);
  }
}
