import * as path from "node:path";
import * as gettextParser from "gettext-parser";
import type { 
  IFormatHandler, 
  FormatOptions, 
  ValidationResult, 
  EnhancedTranslationFile 
} from "../format.interface";
import type { TranslationFile } from "../translate.interface";
import { 
  getPluralRule, 
  formatPluralFormsHeader, 
  validatePluralExpression,
  parseContext,
  createContextKey,
  parsePluralIndex,
  createPluralKey,
  validateContext,
  validatePluralForms
} from "./po-utils";

interface POEntry {
  msgid: string;
  msgstr: string[];
  msgctxt?: string;
  msgid_plural?: string;
  comments?: {
    translator?: string;
    extracted?: string;
    reference?: string;
    flag?: string;
    previous?: string;
  };
}

interface POData {
  charset: string;
  headers: Record<string, string>;
  translations: Record<string, Record<string, POEntry>>;
}

export class POHandler implements IFormatHandler {
  canHandle(filePath: string, content?: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    if (extension !== ".po") {
      return false;
    }

    // If content is provided, check for PO format signatures
    if (content) {
      return /^\s*msgid\s+"/m.test(content) || /^\s*#.*msgid/m.test(content);
    }

    return true;
  }

  parse(content: string): EnhancedTranslationFile {
    try {
      const parsed = gettextParser.po.parse(content) as POData;
      
      // Extract translatable strings from PO structure
      const flattened = this.extractTranslatableStrings(parsed);
      
      // Add metadata
      const result: EnhancedTranslationFile = {
        ...flattened,
        _metadata: {
          format: "po",
          encoding: parsed.charset || "utf-8",
          originalStructure: parsed,
          preserveComments: true,
          preserveAttributes: true,
          poHeaders: parsed.headers,
          sourceLanguage: this.extractLanguageFromHeaders(parsed.headers, "source"),
          targetLanguage: this.extractLanguageFromHeaders(parsed.headers, "target"),
        }
      };

      return result;
    } catch (error) {
      throw new Error(`Failed to parse PO file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  serialize(data: EnhancedTranslationFile, options?: FormatOptions): string {
    try {
      const { _metadata, ...translations } = data;
      
      let poData: POData;
      
      if (_metadata?.originalStructure) {
        // Use original structure and update with translations
        poData = JSON.parse(JSON.stringify(_metadata.originalStructure));
        this.updateTranslations(poData, translations);
      } else {
        // Create new PO structure from translations
        poData = this.createPOStructure(translations, _metadata);
      }

      // Apply encoding from options or metadata
      const encoding = options?.encoding || _metadata?.encoding || "utf-8";
      poData.charset = encoding;
      
      // Update Content-Type header with the correct encoding
      if (encoding !== "utf-8") {
        poData.headers["Content-Type"] = `text/plain; charset=${encoding}`;
      }

      return gettextParser.po.compile(poData, { foldLength: 76 }).toString();
    } catch (error) {
      throw new Error(`Failed to serialize PO file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getFileExtension(): string {
    return ".po";
  }

  validateStructure(data: TranslationFile): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic structure validation
    if (!data || typeof data !== "object") {
      errors.push({
        code: "INVALID_STRUCTURE",
        message: "PO data must be an object",
      });
      return { isValid: false, errors, warnings };
    }

    // Check for empty translations
    const translationKeys = Object.keys(data).filter(key => key !== "_metadata");
    if (translationKeys.length === 0) {
      warnings.push({
        code: "EMPTY_PO",
        message: "PO file appears to have no translatable strings",
      });
    }

    // Validate translation values
    for (const [key, value] of Object.entries(data)) {
      if (key === "_metadata") continue;
      
      if (typeof value !== "string") {
        errors.push({
          code: "INVALID_TRANSLATION_VALUE",
          message: `Translation value for "${key}" must be a string, got ${typeof value}`,
        });
      }
    }

    // Check for potential plural form issues
    this.validatePluralForms(data, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private extractTranslatableStrings(poData: POData): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const [context, translations] of Object.entries(poData.translations)) {
      for (const [msgid, entry] of Object.entries(translations)) {
        // Skip empty msgid (header entry)
        if (!msgid) continue;
        
        // Create unique key for context + msgid using utility function
        const key = createContextKey(context, msgid);
        
        // Handle plural forms
        if (entry.msgid_plural) {
          // For plural forms, use the first msgstr as the translation (singular)
          result[key] = entry.msgstr[0] || "";
          
          // Add plural form entries
          for (let i = 1; i < entry.msgstr.length; i++) {
            const pluralKey = createPluralKey(key, i);
            result[pluralKey] = entry.msgstr[i] || "";
          }
        } else {
          // Regular singular form
          result[key] = entry.msgstr[0] || "";
        }
      }
    }
    
    return result;
  }

  private updateTranslations(poData: POData, translations: Record<string, string>): void {
    for (const [context, contextTranslations] of Object.entries(poData.translations)) {
      for (const [msgid, entry] of Object.entries(contextTranslations)) {
        // Skip empty msgid (header entry)
        if (!msgid) continue;
        
        const key = createContextKey(context, msgid);
        
        // Update regular translation
        if (translations[key] !== undefined) {
          entry.msgstr[0] = translations[key];
        }
        
        // Update plural forms if they exist
        if (entry.msgid_plural) {
          for (let i = 1; i < entry.msgstr.length; i++) {
            const pluralKey = createPluralKey(key, i);
            if (translations[pluralKey] !== undefined) {
              entry.msgstr[i] = translations[pluralKey];
            }
          }
        }
      }
    }
  }

  private createPOStructure(translations: Record<string, string>, metadata?: any): POData {
    const targetLanguage = metadata?.targetLanguage;
    const encoding = metadata?.encoding || "utf-8";
    const headers = metadata?.poHeaders || this.getDefaultHeaders(targetLanguage);
    
    // Update Content-Type header with the correct encoding
    if (encoding !== "utf-8") {
      headers["Content-Type"] = `text/plain; charset=${encoding}`;
    }
    
    const poData: POData = {
      charset: encoding,
      headers,
      translations: {
        "": {} // Default context
      }
    };

    // Add header entry
    poData.translations[""][""] = {
      msgid: "",
      msgstr: [this.formatHeaders(poData.headers)]
    };

    // Process translations
    for (const [key, value] of Object.entries(translations)) {
      const { context, msgid, pluralIndex } = this.parseTranslationKey(key);
      
      // Validate context
      if (context && !validateContext(context)) {
        throw new Error(`Invalid context in key "${key}": context cannot contain separator character`);
      }
      
      // Ensure context exists
      if (!poData.translations[context]) {
        poData.translations[context] = {};
      }
      
      // Ensure entry exists
      if (!poData.translations[context][msgid]) {
        poData.translations[context][msgid] = {
          msgid,
          msgstr: [""]
        };
      }
      
      const entry = poData.translations[context][msgid];
      
      // Handle plural forms
      if (pluralIndex !== undefined) {
        // Ensure msgstr array is large enough
        while (entry.msgstr.length <= pluralIndex) {
          entry.msgstr.push("");
        }
        entry.msgstr[pluralIndex] = value;
        
        // Set msgid_plural if this is a plural form
        if (pluralIndex > 0 && !entry.msgid_plural) {
          entry.msgid_plural = msgid; // This should be set properly based on the original
        }
      } else {
        entry.msgstr[0] = value;
      }
      
      // Set context if it exists
      if (context) {
        entry.msgctxt = context;
      }
    }

    return poData;
  }

  private parseTranslationKey(key: string): { context: string; msgid: string; pluralIndex?: number } {
    // Parse plural form index first
    const { baseKey, pluralIndex } = parsePluralIndex(key);
    
    // Parse context from base key
    const { context, msgid } = parseContext(baseKey);
    
    return {
      context,
      msgid,
      pluralIndex
    };
  }

  private extractLanguageFromHeaders(headers: Record<string, string>, type: "source" | "target"): string | undefined {
    const languageHeader = headers["Language"];
    const localeHeader = headers["Language-Team"];
    
    if (languageHeader) {
      return languageHeader;
    }
    
    if (localeHeader) {
      // Extract language code from Language-Team header
      const match = localeHeader.match(/\(([^)]+)\)/);
      return match ? match[1] : undefined;
    }
    
    return undefined;
  }

  private getDefaultHeaders(language?: string): Record<string, string> {
    const now = new Date();
    const pluralForms = language ? formatPluralFormsHeader(language) : "nplurals=2; plural=(n != 1);";
    
    return {
      "Project-Id-Version": "PACKAGE VERSION",
      "Report-Msgid-Bugs-To": "",
      "POT-Creation-Date": now.toISOString().replace(/T/, " ").replace(/\..+/, " +0000"),
      "PO-Revision-Date": now.toISOString().replace(/T/, " ").replace(/\..+/, " +0000"),
      "Last-Translator": "auto-translate-json-library",
      "Language-Team": language ? `${language.toUpperCase()} <${language}@li.org>` : "LANGUAGE <LL@li.org>",
      "Language": language || "",
      "MIME-Version": "1.0",
      "Content-Type": "text/plain; charset=UTF-8",
      "Content-Transfer-Encoding": "8bit",
      "Plural-Forms": pluralForms
    };
  }

  private formatHeaders(headers: Record<string, string>): string {
    return Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}\\n`)
      .join("");
  }

  private validatePluralForms(data: TranslationFile, warnings: any[]): void {
    const metadata = data._metadata as any;
    const targetLanguage = metadata?.targetLanguage;
    
    if (targetLanguage) {
      // Use comprehensive plural form validation
      const validationResult = validatePluralForms(data, targetLanguage);
      
      if (!validationResult.isValid) {
        for (const missing of validationResult.missing) {
          warnings.push({
            code: "MISSING_PLURAL_FORM",
            message: `Missing plural form: ${missing}`,
          });
        }
        
        for (const extra of validationResult.extra) {
          warnings.push({
            code: "EXTRA_PLURAL_FORM",
            message: `Extra plural form for language ${targetLanguage}: ${extra}`,
          });
        }
      }
    } else {
      // Fallback to basic validation
      const pluralKeys = new Set<string>();
      const singularKeys = new Set<string>();
      
      for (const key of Object.keys(data)) {
        if (key === "_metadata") continue;
        
        const { baseKey, pluralIndex } = parsePluralIndex(key);
        if (pluralIndex !== undefined) {
          pluralKeys.add(baseKey);
        } else {
          singularKeys.add(key);
        }
      }
      
      // Check for incomplete plural forms
      for (const pluralBase of pluralKeys) {
        if (!singularKeys.has(pluralBase)) {
          warnings.push({
            code: "INCOMPLETE_PLURAL_FORM",
            message: `Plural form found for "${pluralBase}" but no singular form exists`,
          });
        }
      }
    }
    
    // Validate plural forms header if present
    if (metadata?.poHeaders?.["Plural-Forms"]) {
      const pluralFormsHeader = metadata.poHeaders["Plural-Forms"];
      const npluralsMatch = pluralFormsHeader.match(/nplurals=(\d+)/);
      const pluralMatch = pluralFormsHeader.match(/plural=([^;]+)/);
      
      if (npluralsMatch && pluralMatch) {
        const nplurals = parseInt(npluralsMatch[1], 10);
        const pluralExpr = pluralMatch[1];
        
        if (!validatePluralExpression(pluralExpr, nplurals)) {
          warnings.push({
            code: "INVALID_PLURAL_EXPRESSION",
            message: `Invalid plural expression: ${pluralExpr}`,
          });
        }
      }
    }
  }
}