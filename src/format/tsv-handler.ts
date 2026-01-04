import * as path from "node:path";
import type { 
  IFormatHandler, 
  FormatOptions, 
  ValidationResult, 
  EnhancedTranslationFile 
} from "../format.interface";
import type { TranslationFile } from "../translate.interface";
import { CsvHandler, type CsvOptions } from "./csv-handler";

export class TsvHandler implements IFormatHandler {
  private csvHandler: CsvHandler;

  constructor() {
    this.csvHandler = new CsvHandler();
  }

  canHandle(filePath: string, content?: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    if (extension !== ".tsv") {
      return false;
    }

    // If content is provided, check for tab-separated format
    if (content) {
      return this.isValidTsvContent(content);
    }

    return true;
  }

  parse(content: string): EnhancedTranslationFile {
    // Use CSV handler with tab delimiter
    const data = this.csvHandler.parse(content);
    
    // Update metadata to indicate TSV format
    if (data._metadata) {
      data._metadata.format = "tsv";
      data._metadata.csvDelimiter = '\t';
    }
    
    return data;
  }

  serialize(data: EnhancedTranslationFile, options?: CsvOptions): string {
    // Force tab delimiter for TSV
    const tsvOptions: CsvOptions = {
      ...options,
      delimiter: '\t'
    };
    
    return this.csvHandler.serialize(data, tsvOptions);
  }

  getFileExtension(): string {
    return ".tsv";
  }

  validateStructure(data: TranslationFile): ValidationResult {
    return this.csvHandler.validateStructure(data);
  }

  private isValidTsvContent(content: string): boolean {
    try {
      // Check if content has tab characters and consistent tab-separated structure
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length === 0) return false;
      
      // Must contain tabs
      if (!content.includes('\t')) return false;
      
      const firstLineFields = lines[0].split('\t').length;
      
      // Check if most lines have consistent field count
      let consistentLines = 0;
      for (const line of lines.slice(0, Math.min(10, lines.length))) {
        const fields = line.split('\t');
        if (fields.length === firstLineFields) {
          consistentLines++;
        }
      }
      
      return consistentLines >= Math.ceil(lines.length * 0.7); // 70% consistency threshold
    } catch {
      return false;
    }
  }
}