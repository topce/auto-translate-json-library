import * as fs from "node:fs";
import * as path from "node:path";
import type { TranslationFile } from "./translate.interface";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import { FormatDetector } from "./format-detector";
import { FormatHandlerFactory } from "./format-handler-factory";
import type { EnhancedTranslationFile } from "./format.interface";
// Import format handlers to ensure they are registered
import "./format";

// Helper function for format-specific error recovery suggestions
function getFormatSpecificSuggestions(format: string, error: Error): string | null {
  const errorMessage = error.message.toLowerCase();
  
  switch (format) {
    case 'json':
      if (errorMessage.includes('syntax') || errorMessage.includes('unexpected')) {
        return 'Check for missing commas, quotes, or brackets. Use a JSON validator to identify syntax issues.';
      }
      if (errorMessage.includes('circular')) {
        return 'Remove circular references from the data structure.';
      }
      break;
      
    case 'xml':
    case 'android-xml':
    case 'ios-xml':
      if (errorMessage.includes('syntax') || errorMessage.includes('parsing')) {
        return 'Check for unclosed tags, missing quotes in attributes, or invalid XML characters.';
      }
      break;
      
    case 'xliff':
      if (errorMessage.includes('validation')) {
        return 'Ensure XLIFF file has proper structure with <file>, <trans-unit>, <source>, and <target> elements.';
      }
      break;
      
    case 'po':
    case 'pot':
      if (errorMessage.includes('syntax') || errorMessage.includes('parsing')) {
        return 'Check for proper msgid/msgstr pairs and correct PO file encoding.';
      }
      break;
      
    case 'yaml':
      if (errorMessage.includes('syntax') || errorMessage.includes('indentation')) {
        return 'Check YAML indentation (use spaces, not tabs) and ensure proper key-value syntax.';
      }
      break;
      
    case 'properties':
      if (errorMessage.includes('encoding')) {
        return 'Check file encoding (should be UTF-8 or ISO-8859-1) and Unicode escape sequences.';
      }
      break;
      
    case 'csv':
    case 'tsv':
      if (errorMessage.includes('parsing')) {
        return 'Check for proper delimiter usage and ensure quoted fields are properly escaped.';
      }
      break;
      
    case 'arb':
      if (errorMessage.includes('validation')) {
        return 'Ensure ARB file has proper JSON structure with @@locale metadata and valid resource entries.';
      }
      break;
      
    case 'xmb':
    case 'xtb':
      if (errorMessage.includes('validation')) {
        return 'Check for proper XMB/XTB structure with <messagebundle>/<translationbundle> root elements.';
      }
      break;
      
    default:
      if (errorMessage.includes('unknown') || errorMessage.includes('unsupported')) {
        const supportedFormats = FormatDetector.getSupportedFormats().join(', ');
        return `Supported formats: ${supportedFormats}. Consider using --format parameter to specify format explicitly.`;
      }
      break;
  }
  
  return null;
}

export interface IFiles {
  sourceLocale: string;
  targetLocales: Array<string>;
  loadJsonFromLocale(locale: string): Promise<TranslationFile>;
  saveJsonToLocale(locale: string, file: TranslationFile): void;
  getDetectedFormat?(): string | undefined;
  getFormatOverride?(): string | undefined;
}

export const readFileAsync: (filename: string) => Promise<string> = (
  filename: string,
) =>
  new Promise((resolve, reject) => {
    const exist = fs.existsSync(filename);
    if (!exist) fs.writeFileSync(filename, "");
    fs.readFile(filename, (error, data) => {
      error ? reject(error) : resolve(data.toString());
    });
  });

export const loadJsonFromLocale: (
  fileName: string,
) => Promise<TranslationFile> = async (fileName: string) => {
  try {
    let data = await readFileAsync(fileName);
    // handle empty files
    if (!data) {
      // return an empty object for both JSON and XML
      return {} as TranslationFile;
    }

    // Try to use new format system first
    const format = FormatDetector.detectFormat(fileName, data);
    const handler = FormatHandlerFactory.getHandler(format);
    
    if (handler) {
      try {
        // Validate structure before parsing
        const tempResult = handler.parse(data);
        const validation = handler.validateStructure(tempResult);
        
        if (!validation.isValid) {
          const errorMessages = validation.errors.map(e => `${e.code}: ${e.message}`).join(', ');
          throw new Error(`${format.toUpperCase()} validation failed: ${errorMessages}`);
        }
        
        if (validation.warnings.length > 0) {
          const warningMessages = validation.warnings.map(w => `${w.code}: ${w.message}`).join(', ');
          console.warn(`${format.toUpperCase()} validation warnings for ${fileName}: ${warningMessages}`);
        }
        
        // Remove metadata for backward compatibility
        const { _metadata, ...cleanResult } = tempResult as EnhancedTranslationFile;
        return cleanResult;
      } catch (error) {
        if (error instanceof SyntaxError) {
          throw new Error(`${format.toUpperCase()} syntax error in ${fileName}: ${error.message}`);
        } else if (error instanceof Error && error.message.includes('validation failed')) {
          throw error; // Re-throw validation errors as-is
        } else {
          throw new Error(`Failed to parse ${format.toUpperCase()} file ${fileName}: ${error}`);
        }
      }
    }

    // Legacy fallback parsing with enhanced error handling
    const ext = path.extname(fileName).toLowerCase();
    if (ext === ".xml") {
      try {
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "@_",
          textNodeName: "#text",
          allowBooleanAttributes: true,
          parseTagValue: true,
          parseAttributeValue: true,
          trimValues: false,
        });
        return parser.parse(data) as TranslationFile;
      } catch (error) {
        throw new Error(`XML parsing error in ${fileName}: ${error}. Please check XML syntax and structure.`);
      }
    }

    // default to JSON with enhanced error handling
    try {
      return JSON.parse(data);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`JSON syntax error in ${fileName}: ${error.message}. Please check JSON formatting.`);
      }
      throw new Error(`Failed to parse JSON file ${fileName}: ${error}`);
    }
  } catch (error) {
    // Provide format-specific recovery suggestions
    const format = FormatDetector.detectFormat(fileName);
    const suggestions = getFormatSpecificSuggestions(format, error as Error);
    throw new Error(`${error}${suggestions ? ` Suggestions: ${suggestions}` : ''}`);
  }
};

export const saveJsonToLocale = (filename: string, file: TranslationFile) => {
  try {
    // Try to use new format system first
    const format = FormatDetector.detectFormat(filename);
    const handler = FormatHandlerFactory.getHandler(format);
    
    if (handler) {
      try {
        // Validate structure before serializing
        const validation = handler.validateStructure(file);
        
        if (!validation.isValid) {
          const errorMessages = validation.errors.map(e => `${e.code}: ${e.message}`).join(', ');
          throw new Error(`${format.toUpperCase()} validation failed: ${errorMessages}`);
        }
        
        if (validation.warnings.length > 0) {
          const warningMessages = validation.warnings.map(w => `${w.code}: ${w.message}`).join(', ');
          console.warn(`${format.toUpperCase()} validation warnings for ${filename}: ${warningMessages}`);
        }
        
        const data = handler.serialize(file as EnhancedTranslationFile, {
          preserveFormatting: true,
          indentation: 2,
          xmlDeclaration: true,
        });
        fs.writeFileSync(filename, data, "utf8");
        return;
      } catch (error) {
        if (error instanceof Error && error.message.includes('validation failed')) {
          throw error; // Re-throw validation errors as-is
        } else {
          throw new Error(`Failed to serialize ${format.toUpperCase()} file ${filename}: ${error}`);
        }
      }
    }

    // Legacy fallback serialization with enhanced error handling
    const ext = path.extname(filename).toLowerCase();
    let data: string;
    if (ext === ".xml") {
      try {
        const builder = new XMLBuilder({
          ignoreAttributes: false,
          attributeNamePrefix: "@_",
          textNodeName: "#text",
          format: true,
          indentBy: "  ",
          suppressEmptyNode: true,
        });
        data = builder.build(file);
      } catch (error) {
        throw new Error(`XML serialization error for ${filename}: ${error}. Please check data structure compatibility with XML format.`);
      }
    } else {
      try {
        data = JSON.stringify(file, null, "  ");
      } catch (error) {
        throw new Error(`JSON serialization error for ${filename}: ${error}. Please check for circular references or unsupported data types.`);
      }
    }

    fs.writeFileSync(filename, data, "utf8");
  } catch (error) {
    // Provide format-specific recovery suggestions
    const format = FormatDetector.detectFormat(filename);
    const suggestions = getFormatSpecificSuggestions(format, error as Error);
    throw new Error(`${error}${suggestions ? ` Suggestions: ${suggestions}` : ''}`);
  }
};

export class Files implements IFiles {
  folderPath: string;
  sourceLocale: string;
  targetLocales: Array<string>;
  private fileExt: string;
  private formatOverride?: string;
  private detectedFormat?: string;

  constructor(filePath: string, formatOverride?: string) {
    this.folderPath = path.dirname(filePath);
    const fileName = path.basename(filePath);
    this.fileExt = path.extname(fileName);
    this.formatOverride = formatOverride;
    this.sourceLocale = this.getLocaleFromFilename(fileName);
    this.targetLocales = this.getTargetLocales();
    
    // Detect format for the source file
    this.detectedFormat = this.detectFileFormat(filePath);
  }

  private getLocaleFromFilename(fileName: string): string {
    return path.parse(fileName).name;
  }

  private detectFileFormat(filePath: string): string {
    if (this.formatOverride) {
      return this.formatOverride;
    }
    
    // Try to read a small portion of the file for content-based detection
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8').substring(0, 1000); // Read first 1KB
        return FormatDetector.detectFormat(filePath, content);
      }
    } catch (error) {
      // If file reading fails, fall back to extension-based detection
      console.warn(`Could not read file for format detection: ${error}`);
    }
    
    return FormatDetector.detectFormat(filePath);
  }

  private getTargetLocales(): string[] {
    const locales = [];

    const files = fs.readdirSync(this.folderPath);

    for (const file of files) {
      if (path.extname(file) !== this.fileExt) continue; // only same extension
      const locale = this.getLocaleFromFilename(file);
      if (locale !== this.sourceLocale) {
        locales.push(locale);
      }
    }

    return locales;
  }

  getDetectedFormat(): string | undefined {
    return this.detectedFormat;
  }

  getFormatOverride(): string | undefined {
    return this.formatOverride;
  }

  async loadJsonFromLocale(locale: string): Promise<TranslationFile> {
    const filename = `${this.folderPath}/${locale}${this.fileExt}`;
    
    try {
      let data = await readFileAsync(filename);
      
      // Handle empty files
      if (!data) {
        return {} as TranslationFile;
      }

      // Use format detection for this specific file
      const format = this.formatOverride || FormatDetector.detectFormat(filename, data);
      const handler = FormatHandlerFactory.getHandler(format);
      
      if (handler) {
        try {
          const result = handler.parse(data);
          // Remove metadata for backward compatibility
          const { _metadata, ...cleanResult } = result as EnhancedTranslationFile;
          return cleanResult;
        } catch (error) {
          throw new Error(`Failed to parse ${format} file ${filename}: ${error}`);
        }
      }

      // Legacy fallback parsing for backward compatibility
      const ext = path.extname(filename).toLowerCase();
      if (ext === ".xml") {
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "@_",
          textNodeName: "#text",
          allowBooleanAttributes: true,
          parseTagValue: true,
          parseAttributeValue: true,
          trimValues: false,
        });
        return parser.parse(data) as TranslationFile;
      }

      // Default to JSON
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to load translation file for locale ${locale}: ${error}`);
    }
  }

  saveJsonToLocale(locale: string, file: TranslationFile): void {
    const filename = `${this.folderPath}/${locale}${this.fileExt}`;
    
    try {
      // Use format detection for this specific file
      const format = this.formatOverride || FormatDetector.detectFormat(filename);
      const handler = FormatHandlerFactory.getHandler(format);
      
      if (handler) {
        try {
          const data = handler.serialize(file as EnhancedTranslationFile, {
            preserveFormatting: true,
            indentation: 2,
            xmlDeclaration: true,
          });
          fs.writeFileSync(filename, data, "utf8");
          return;
        } catch (error) {
          throw new Error(`Failed to serialize ${format} file ${filename}: ${error}`);
        }
      }

      // Legacy fallback serialization for backward compatibility
      const ext = path.extname(filename).toLowerCase();
      let data: string;
      if (ext === ".xml") {
        const builder = new XMLBuilder({
          ignoreAttributes: false,
          attributeNamePrefix: "@_",
          textNodeName: "#text",
          format: true,
          indentBy: "  ",
          suppressEmptyNode: true,
        });
        data = builder.build(file);
      } else {
        data = JSON.stringify(file, null, "  ");
      }

      fs.writeFileSync(filename, data, "utf8");
    } catch (error) {
      throw new Error(`Failed to save translation file for locale ${locale}: ${error}`);
    }
  }
}
