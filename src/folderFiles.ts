import * as fs from "node:fs";
import * as path from "node:path";
import { type IFiles, loadJsonFromLocale, saveJsonToLocale } from "./files";
import type { TranslationFile } from "./translate.interface";

export class FolderFiles implements IFiles {
  folderPath: string;
  sourceLocale: string;
  targetLocales: Array<string>;
  fileName: string;
  private formatOverride?: string;

  constructor(filePath: string, formatOverride?: string) {
    const localeDir = path.dirname(filePath);
    this.folderPath = path.dirname(localeDir);
    this.fileName = path.basename(filePath);
    this.sourceLocale = path.basename(localeDir);
    this.formatOverride = formatOverride;
    this.targetLocales = this.getTargetLocales();

    console.log(
      this.folderPath,
      this.fileName,
      this.sourceLocale,
      this.targetLocales,
    );
  }

  getDetectedFormat(): string | undefined {
    // For folder mode, we detect format from the source file
    const sourceFilePath = this.createFileName(this.sourceLocale);
    try {
      if (fs.existsSync(sourceFilePath)) {
        const { FormatDetector } = require("./format-detector");
        const content = fs.readFileSync(sourceFilePath, 'utf8').substring(0, 1000);
        return FormatDetector.detectFormat(sourceFilePath, content);
      }
    } catch (error) {
      console.warn(`Could not detect format for ${sourceFilePath}: ${error}`);
    }
    return undefined;
  }

  getFormatOverride(): string | undefined {
    return this.formatOverride;
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
