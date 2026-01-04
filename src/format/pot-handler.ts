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
  formatPluralFormsHeader,
  parseContext,
  createContextKey,
  parsePluralIndex,
  createPluralKey,
  validateContext
} from "./po-utils";

interface POTEntry {
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

interface POTData {
  charset: string;
  headers: Record<string, string>;
  translations: Record<string, Record<string, POTEntry>>;
}

export class POTHandler implements IFormatHandler {
  canHandle(filePath: string, content?: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    if (extension !== ".pot") {
      return false;
    }

    // If content is provided, check for POT format signatures
    if (content) {
      return /^\s*#.*POT-Creation-Date/m.test(content) || 
             (/^\s*msgid\s+"/m.test(content) && /^\s*msgstr\s+""/m.test(content));
    }

    return true;
  }

  parse(content: string): EnhancedTranslationFile {
    try {
      const parsed = gettextParser.po.parse(content) as POTData;
      
      // Extract template strings from POT structure
      const templateStrings = this.extractTemplateStrings(parsed);
      
      // Add metadata
      const result: EnhancedTranslationFile = {
        ...templateStrings,
        _metadata: {
          format: "pot",
          encoding: parsed.charset || "utf-8",
          originalStructure: parsed,
          preserveComments: true,
          preserveAttributes: true,
          potHeaders: parsed.headers,
          sourceLanguage: this.extractLanguageFromHeaders(parsed.headers),
          isTemplate: true,
        }
      };

      return result;
    } catch (error) {
      throw new Error(`Failed to parse POT file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  serialize(data: EnhancedTranslationFile, options?: FormatOptions): string {
    try {
      const { _metadata, ...translations } = data;
      
      let potData: POTData;
      
      if (_metadata?.originalStructure) {
        // Use original structure - POT files typically don't get updated with translations
        potData = JSON.parse(JSON.stringify(_metadata.originalStructure));
      } else {
        // Create new POT structure from template data
        potData = this.createPOTStructure(translations, _metadata);
      }

      // Apply encoding from options or metadata
      const encoding = options?.encoding || _metadata?.encoding || "utf-8";
      potData.charset = encoding;

      return gettextParser.po.compile(potData, { foldLength: 76 }).toString();
    } catch (error) {
      throw new Error(`Failed to serialize POT file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getFileExtension(): string {
    return ".pot";
  }

  validateStructure(data: TranslationFile): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic structure validation
    if (!data || typeof data !== "object") {
      errors.push({
        code: "INVALID_STRUCTURE",
        message: "POT data must be an object",
      });
      return { isValid: false, errors, warnings };
    }

    // Check for empty template
    const templateKeys = Object.keys(data).filter(key => key !== "_metadata");
    if (templateKeys.length === 0) {
      warnings.push({
        code: "EMPTY_POT",
        message: "POT template appears to have no translatable strings",
      });
    }

    // Validate template structure - POT files should have empty msgstr values
    for (const [key, value] of Object.entries(data)) {
      if (key === "_metadata") continue;
      
      if (typeof value !== "string") {
        errors.push({
          code: "INVALID_TEMPLATE_VALUE",
          message: `Template value for "${key}" must be a string, got ${typeof value}`,
        });
      } else if (value !== "" && !key.includes("[")) {
        // Non-empty values in templates might indicate this is not a proper template
        warnings.push({
          code: "NON_EMPTY_TEMPLATE_VALUE",
          message: `Template value for "${key}" is not empty - POT templates typically have empty msgstr values`,
        });
      }
    }

    // Validate POT-specific headers
    const metadata = data._metadata as any;
    if (metadata?.potHeaders) {
      this.validatePOTHeaders(metadata.potHeaders, warnings);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate PO file content from POT template for a specific target language
   */
  generatePOFromTemplate(potContent: string, targetLanguage: string, translations?: Record<string, string>): string {
    try {
      const potData = gettextParser.po.parse(potContent) as POTData;
      
      // Clone the POT structure to create PO
      const poData: POTData = JSON.parse(JSON.stringify(potData));
      
      // Update headers for target language
      this.updateHeadersForLanguage(poData.headers, targetLanguage);
      
      // Apply translations if provided
      if (translations) {
        this.applyTranslationsToTemplate(poData, translations);
      }
      
      return gettextParser.po.compile(poData, { foldLength: 76 }).toString();
    } catch (error) {
      throw new Error(`Failed to generate PO from POT template: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractTemplateStrings(potData: POTData): Record<string, string> {
    const result: Record<string, string> = {};
    
    for (const [context, translations] of Object.entries(potData.translations)) {
      for (const [msgid, entry] of Object.entries(translations)) {
        // Skip empty msgid (header entry)
        if (!msgid) continue;
        
        // Create unique key for context + msgid using utility function
        const key = createContextKey(context, msgid);
        
        // Handle plural forms
        if (entry.msgid_plural) {
          // For plural forms in templates, all msgstr entries are typically empty
          result[key] = ""; // Singular form
          
          // Add plural form entries (typically empty in templates)
          for (let i = 1; i < entry.msgstr.length; i++) {
            const pluralKey = createPluralKey(key, i);
            result[pluralKey] = "";
          }
        } else {
          // Regular singular form (typically empty in templates)
          result[key] = "";
        }
      }
    }
    
    return result;
  }

  private createPOTStructure(templateStrings: Record<string, string>, metadata?: any): POTData {
    const potData: POTData = {
      charset: metadata?.encoding || "utf-8",
      headers: metadata?.potHeaders || this.getDefaultPOTHeaders(),
      translations: {
        "": {} // Default context
      }
    };

    // Add header entry
    potData.translations[""][""] = {
      msgid: "",
      msgstr: [this.formatHeaders(potData.headers)]
    };

    // Process template strings
    for (const [key, value] of Object.entries(templateStrings)) {
      const { context, msgid, pluralIndex } = this.parseTranslationKey(key);
      
      // Validate context
      if (context && !validateContext(context)) {
        throw new Error(`Invalid context in key "${key}": context cannot contain separator character`);
      }
      
      // Ensure context exists
      if (!potData.translations[context]) {
        potData.translations[context] = {};
      }
      
      // Ensure entry exists
      if (!potData.translations[context][msgid]) {
        potData.translations[context][msgid] = {
          msgid,
          msgstr: [""] // Empty in templates
        };
      }
      
      const entry = potData.translations[context][msgid];
      
      // Handle plural forms
      if (pluralIndex !== undefined) {
        // Ensure msgstr array is large enough
        while (entry.msgstr.length <= pluralIndex) {
          entry.msgstr.push("");
        }
        // Keep empty for templates
        entry.msgstr[pluralIndex] = "";
        
        // Set msgid_plural if this is a plural form
        if (pluralIndex > 0 && !entry.msgid_plural) {
          entry.msgid_plural = msgid;
        }
      } else {
        // Keep empty for templates
        entry.msgstr[0] = "";
      }
    }

    return potData;
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

  private extractLanguageFromHeaders(headers: Record<string, string>): string | undefined {
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

  private getDefaultPOTHeaders(): Record<string, string> {
    const now = new Date();
    return {
      "Project-Id-Version": "PACKAGE VERSION",
      "Report-Msgid-Bugs-To": "",
      "POT-Creation-Date": now.toISOString().replace(/T/, " ").replace(/\..+/, " +0000"),
      "PO-Revision-Date": "YEAR-MO-DA HO:MI+ZONE",
      "Last-Translator": "FULL NAME <EMAIL@ADDRESS>",
      "Language-Team": "LANGUAGE <LL@li.org>",
      "Language": "",
      "MIME-Version": "1.0",
      "Content-Type": "text/plain; charset=UTF-8",
      "Content-Transfer-Encoding": "8bit",
      "Plural-Forms": "nplurals=INTEGER; plural=EXPRESSION;"
    };
  }

  private formatHeaders(headers: Record<string, string>): string {
    return Object.entries(headers)
      .map(([key, value]) => `${key}: ${value}\\n`)
      .join("");
  }

  private updateHeadersForLanguage(headers: Record<string, string>, targetLanguage: string): void {
    const now = new Date();
    
    headers["Language"] = targetLanguage;
    headers["PO-Revision-Date"] = now.toISOString().replace(/T/, " ").replace(/\..+/, " +0000");
    headers["Last-Translator"] = "auto-translate-json-library";
    
    // Update Language-Team if it's still the template value
    if (headers["Language-Team"] === "LANGUAGE <LL@li.org>") {
      headers["Language-Team"] = `${targetLanguage.toUpperCase()} <${targetLanguage}@li.org>`;
    }
    
    // Set appropriate plural forms based on language using utility function
    headers["Plural-Forms"] = formatPluralFormsHeader(targetLanguage);
  }

  private applyTranslationsToTemplate(poData: POTData, translations: Record<string, string>): void {
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



  private validatePOTHeaders(headers: Record<string, string>, warnings: any[]): void {
    const requiredHeaders = [
      "Project-Id-Version",
      "POT-Creation-Date",
      "Content-Type",
      "Content-Transfer-Encoding"
    ];
    
    for (const header of requiredHeaders) {
      if (!headers[header]) {
        warnings.push({
          code: "MISSING_POT_HEADER",
          message: `Missing required POT header: ${header}`,
        });
      }
    }
    
    // Check for template placeholders that should be filled
    const templatePlaceholders = [
      "YEAR-MO-DA HO:MI+ZONE",
      "FULL NAME <EMAIL@ADDRESS>",
      "LANGUAGE <LL@li.org>",
      "PACKAGE VERSION"
    ];
    
    for (const [key, value] of Object.entries(headers)) {
      if (templatePlaceholders.some(placeholder => value.includes(placeholder))) {
        warnings.push({
          code: "TEMPLATE_PLACEHOLDER",
          message: `Header "${key}" contains template placeholder: ${value}`,
        });
      }
    }
  }
}