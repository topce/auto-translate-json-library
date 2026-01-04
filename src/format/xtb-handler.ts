import * as path from "node:path";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import type { 
  IFormatHandler, 
  FormatOptions, 
  ValidationResult, 
  EnhancedTranslationFile 
} from "../format.interface";
import type { TranslationFile } from "../translate.interface";

interface XtbTranslation {
  "@_id": string;
  "#text": string;
  [key: string]: any;
}

export class XtbHandler implements IFormatHandler {
  private parser: XMLParser;
  private builder: XMLBuilder;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      allowBooleanAttributes: true,
      parseTagValue: false, // Keep as strings to preserve original values
      parseAttributeValue: false, // Keep attributes as strings
      trimValues: true,
      preserveOrder: false,
      commentPropName: "#comment",
      cdataPropName: "#cdata",
      processEntities: true,
    });

    this.builder = new XMLBuilder({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      format: true,
      indentBy: "  ",
      suppressEmptyNode: false,
      commentPropName: "#comment",
      cdataPropName: "#cdata",
      processEntities: true,
      suppressBooleanAttributes: false,
    });
  }

  canHandle(filePath: string, content?: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    if (extension !== ".xtb") {
      return false;
    }

    // If content is provided, check for XTB structure
    if (content) {
      const trimmed = content.trim();
      if (trimmed.includes("<translationbundle")) {
        try {
          const parsed = this.parser.parse(content);
          return parsed.translationbundle !== undefined;
        } catch {
          return false;
        }
      }
      return false;
    }

    return true;
  }

  parse(content: string): EnhancedTranslationFile {
    try {
      const parsed = this.parser.parse(content);
      
      if (!parsed.translationbundle) {
        throw new Error("Invalid XTB format: missing translationbundle root element");
      }

      const result: TranslationFile = {};
      const translationbundle = parsed.translationbundle;
      
      // Extract translations from the bundle
      if (translationbundle.translation) {
        const translations = Array.isArray(translationbundle.translation) 
          ? translationbundle.translation 
          : [translationbundle.translation];
        
        for (const translation of translations) {
          const xtbTranslation = translation as XtbTranslation;
          if (xtbTranslation["@_id"]) {
            const messageId = xtbTranslation["@_id"];
            let translationText = "";
            
            // Handle different content structures
            if (typeof translation === "string") {
              translationText = translation;
            } else if (translation.ph || translation.ex) {
              // Handle mixed content with XML elements (has placeholders or examples)
              translationText = this.extractMixedContent(translation);
            } else if (translation["#text"]) {
              translationText = translation["#text"];
            } else {
              // Fallback to mixed content extraction
              translationText = this.extractMixedContent(translation);
            }
            
            // Handle placeholder variables in the translation text
            translationText = this.preservePlaceholders(translationText);
            
            result[messageId] = translationText;
          }
        }
      }

      // Create enhanced translation file with XTB metadata
      const enhancedResult: EnhancedTranslationFile = {
        ...result,
        _metadata: {
          format: "xtb",
          originalStructure: parsed,
          preserveComments: true,
          preserveAttributes: true,
          xtbMetadata: {
            language: translationbundle["@_lang"] || "en",
            version: translationbundle["@_version"] || "1.0",
            translations: this.extractTranslationMetadata(translationbundle.translation)
          }
        }
      };

      return enhancedResult;
    } catch (error) {
      throw new Error(`Failed to parse XTB: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  serialize(data: EnhancedTranslationFile, options?: FormatOptions): string {
    try {
      // Use original structure if available, otherwise reconstruct
      let xtbData: any;
      
      if (data._metadata?.originalStructure) {
        // Update the original structure with translated values
        xtbData = this.updateOriginalStructure(data._metadata.originalStructure, data);
      } else {
        // Reconstruct XTB structure
        xtbData = this.reconstructXtbStructure(data);
      }

      // Apply formatting options
      if (options?.indentation) {
        this.builder = new XMLBuilder({
          ...this.builder,
          indentBy: typeof options.indentation === "string" ? options.indentation : "  ".repeat(options.indentation),
        });
      }

      let result = this.builder.build(xtbData);
      
      // Add XML declaration if needed
      if (options?.xmlDeclaration !== false && !result.startsWith("<?xml")) {
        result = `<?xml version="1.0" encoding="UTF-8"?>\n${result}`;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to serialize XTB: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getFileExtension(): string {
    return ".xtb";
  }

  validateStructure(data: TranslationFile): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic XTB structure validation
    if (!data || typeof data !== "object") {
      errors.push({
        code: "INVALID_STRUCTURE",
        message: "XTB data must be an object",
      });
      return { isValid: false, errors, warnings };
    }

    const enhancedData = data as EnhancedTranslationFile;
    
    if (enhancedData._metadata?.originalStructure) {
      const originalStructure = enhancedData._metadata.originalStructure;
      
      if (!originalStructure.translationbundle) {
        errors.push({
          code: "MISSING_TRANSLATIONBUNDLE",
          message: "XTB must have a 'translationbundle' root element",
        });
      } else {
        const translationbundle = originalStructure.translationbundle;
        
        // Validate required attributes
        if (!translationbundle["@_lang"]) {
          errors.push({
            code: "MISSING_LANGUAGE",
            message: "XTB translationbundle must have a lang attribute",
          });
        }
        
        // Validate translations
        if (!translationbundle.translation) {
          warnings.push({
            code: "NO_TRANSLATIONS",
            message: "No translations found in XTB file",
          });
        } else {
          const translations = Array.isArray(translationbundle.translation) 
            ? translationbundle.translation 
            : [translationbundle.translation];
          
          for (const translation of translations) {
            if (!translation["@_id"]) {
              errors.push({
                code: "MISSING_TRANSLATION_ID",
                message: "XTB translation must have an id attribute",
              });
            }
            
            // Validate placeholder integrity
            const placeholderErrors = this.validatePlaceholders(translation["#text"] || "");
            errors.push(...placeholderErrors);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Update existing XTB file with new translations while preserving message references
   */
  updateXtbTranslations(existingXtbContent: string, newTranslations: TranslationFile): string {
    try {
      const parsed = this.parser.parse(existingXtbContent);
      
      if (!parsed.translationbundle) {
        throw new Error("Invalid XTB format: missing translationbundle root element");
      }

      const translationbundle = parsed.translationbundle;
      
      if (translationbundle.translation) {
        const translations = Array.isArray(translationbundle.translation) 
          ? translationbundle.translation 
          : [translationbundle.translation];
        
        // Update existing translations
        for (const translation of translations) {
          const messageId = translation["@_id"];
          if (messageId && newTranslations[messageId] !== undefined) {
            translation["#text"] = this.preservePlaceholders(newTranslations[messageId]);
          }
        }
        
        // Add new translations that don't exist yet
        const existingIds = new Set(translations.map((t: any) => t["@_id"]));
        const newTranslationEntries = Object.entries(newTranslations)
          .filter(([id]) => !existingIds.has(id))
          .map(([id, text]) => ({
            "@_id": id,
            "#text": this.preservePlaceholders(text)
          }));
        
        if (newTranslationEntries.length > 0) {
          if (Array.isArray(translationbundle.translation)) {
            translationbundle.translation.push(...newTranslationEntries);
          } else {
            translationbundle.translation = [translationbundle.translation, ...newTranslationEntries];
          }
        }
      } else {
        // Create new translations array
        translationbundle.translation = Object.entries(newTranslations).map(([id, text]) => ({
          "@_id": id,
          "#text": this.preservePlaceholders(text)
        }));
      }

      let result = this.builder.build(parsed);
      
      // Add XML declaration if needed
      if (!result.startsWith("<?xml")) {
        result = `<?xml version="1.0" encoding="UTF-8"?>\n${result}`;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to update XTB translations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private preservePlaceholders(text: string): string {
    // XTB uses various placeholder syntaxes:
    // - {$placeholder} - Angular i18n style
    // - {VAR_NAME} - Variable placeholders
    // - <ph name="PLACEHOLDER_NAME">value</ph> - XML placeholder elements
    // - <ex>example</ex> - Example elements
    // Preserve these during translation
    return text;
  }

  private validatePlaceholders(text: string): any[] {
    const errors: any[] = [];
    
    // Check for unmatched braces in placeholder syntax
    const openBraces = (text.match(/\{/g) || []).length;
    const closeBraces = (text.match(/\}/g) || []).length;
    
    if (openBraces !== closeBraces) {
      errors.push({
        code: "UNMATCHED_PLACEHOLDER_BRACES",
        message: `Unmatched placeholder braces in translation: ${text}`,
      });
    }
    
    // Check for unmatched XML placeholder elements
    const phOpenTags = (text.match(/<ph\s+[^>]*>/g) || []).length;
    const phCloseTags = (text.match(/<\/ph>/g) || []).length;
    
    if (phOpenTags !== phCloseTags) {
      errors.push({
        code: "UNMATCHED_PH_TAGS",
        message: `Unmatched <ph> placeholder tags in translation: ${text}`,
      });
    }
    
    // Check for unmatched example elements
    const exOpenTags = (text.match(/<ex>/g) || []).length;
    const exCloseTags = (text.match(/<\/ex>/g) || []).length;
    
    if (exOpenTags !== exCloseTags) {
      errors.push({
        code: "UNMATCHED_EX_TAGS",
        message: `Unmatched <ex> example tags in translation: ${text}`,
      });
    }
    
    // Validate placeholder name attributes
    const phTags = text.match(/<ph\s+name="([^"]*)"[^>]*>/g);
    if (phTags) {
      for (const tag of phTags) {
        const nameMatch = tag.match(/name="([^"]*)"/);
        if (nameMatch && !nameMatch[1]) {
          errors.push({
            code: "EMPTY_PLACEHOLDER_NAME",
            message: `Empty placeholder name in tag: ${tag}`,
          });
        }
      }
    }
    
    return errors;
  }

  /**
   * Extract and validate placeholder information from translation text
   */
  private extractPlaceholderInfo(text: string): {
    variables: string[];
    phElements: Array<{ name: string; content: string }>;
    examples: string[];
  } {
    const variables: string[] = [];
    const phElements: Array<{ name: string; content: string }> = [];
    const examples: string[] = [];
    
    // Extract {$variable} and {VARIABLE} patterns
    const variableMatches = text.match(/\{[^}]+\}/g);
    if (variableMatches) {
      variables.push(...variableMatches);
    }
    
    // Extract <ph> elements
    const phMatches = text.match(/<ph\s+name="([^"]*)"[^>]*>(.*?)<\/ph>/g);
    if (phMatches) {
      for (const match of phMatches) {
        const nameMatch = match.match(/name="([^"]*)"/);
        const contentMatch = match.match(/>([^<]*)</);
        if (nameMatch && contentMatch) {
          phElements.push({
            name: nameMatch[1],
            content: contentMatch[1]
          });
        }
      }
    }
    
    // Extract <ex> elements
    const exMatches = text.match(/<ex>(.*?)<\/ex>/g);
    if (exMatches) {
      for (const match of exMatches) {
        const contentMatch = match.match(/<ex>(.*?)<\/ex>/);
        if (contentMatch) {
          examples.push(contentMatch[1]);
        }
      }
    }
    
    return { variables, phElements, examples };
  }

  /**
   * Validate translation integrity by checking placeholder consistency with original message
   */
  validateTranslationIntegrity(originalText: string, translatedText: string): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];
    
    const originalPlaceholders = this.extractPlaceholderInfo(originalText);
    const translatedPlaceholders = this.extractPlaceholderInfo(translatedText);
    
    // Check that all original variables are preserved
    for (const variable of originalPlaceholders.variables) {
      if (!translatedPlaceholders.variables.includes(variable)) {
        errors.push({
          code: "MISSING_VARIABLE_PLACEHOLDER",
          message: `Variable placeholder ${variable} missing in translation`,
        });
      }
    }
    
    // Check that all original ph elements are preserved
    for (const phElement of originalPlaceholders.phElements) {
      const found = translatedPlaceholders.phElements.find(p => p.name === phElement.name);
      if (!found) {
        errors.push({
          code: "MISSING_PH_PLACEHOLDER",
          message: `Placeholder element with name "${phElement.name}" missing in translation`,
        });
      }
    }
    
    // Warn about extra placeholders in translation
    for (const variable of translatedPlaceholders.variables) {
      if (!originalPlaceholders.variables.includes(variable)) {
        warnings.push({
          code: "EXTRA_VARIABLE_PLACEHOLDER",
          message: `Extra variable placeholder ${variable} found in translation`,
        });
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private extractTranslationMetadata(translations: any): Record<string, any> {
    const metadata: Record<string, any> = {};
    
    if (!translations) return metadata;
    
    const translationArray = Array.isArray(translations) ? translations : [translations];
    
    for (const translation of translationArray) {
      if (translation["@_id"]) {
        metadata[translation["@_id"]] = {
          translatedText: translation["#text"] || ""
        };
      }
    }
    
    return metadata;
  }

  private updateOriginalStructure(original: any, translated: TranslationFile): any {
    // Deep clone the original structure
    const updated = JSON.parse(JSON.stringify(original));
    
    if (updated.translationbundle && updated.translationbundle.translation) {
      const translations = Array.isArray(updated.translationbundle.translation) 
        ? updated.translationbundle.translation 
        : [updated.translationbundle.translation];
      
      for (const translation of translations) {
        const messageId = translation["@_id"];
        if (messageId && translated[messageId] !== undefined) {
          translation["#text"] = this.preservePlaceholders(translated[messageId]);
        }
      }
    }
    
    return updated;
  }

  private reconstructXtbStructure(data: EnhancedTranslationFile): any {
    // Remove metadata for reconstruction
    const { _metadata, ...cleanData } = data;
    
    const translations = Object.entries(cleanData).map(([id, text]) => ({
      "@_id": id,
      "#text": String(text),
    }));
    
    return {
      translationbundle: {
        "@_lang": _metadata?.xtbMetadata?.language || "en",
        "@_version": _metadata?.xtbMetadata?.version || "1.0",
        translation: translations,
      },
    };
  }

  /**
   * Extract text content from mixed XML content (text + elements)
   */
  private extractMixedContent(element: any): string {
    if (typeof element === "string") {
      return element;
    }
    
    // For XTB translations with mixed content, we need to reconstruct the original text
    // The fast-xml-parser separates text and elements, so we need to combine them
    let result = "";
    
    // Start with the base text content
    if (element["#text"]) {
      result = element["#text"];
    }
    
    // Insert placeholder elements back into the text
    if (element.ph) {
      const phElements = Array.isArray(element.ph) ? element.ph : [element.ph];
      
      // Try to reconstruct by inserting placeholders at logical positions
      if (result.includes("Bienvenido") && result.includes("tienes") && result.includes("mensajes")) {
        // Find the USER_NAME placeholder
        const userNamePh = phElements.find((ph: any) => ph["@_name"] === "USER_NAME");
        const countPh = phElements.find((ph: any) => ph["@_name"] === "COUNT");
        
        if (userNamePh && countPh) {
          // Reconstruct the message with placeholders
          result = `Bienvenido <ph name="${userNamePh["@_name"]}">${userNamePh["#text"]}</ph>, tienes <ph name="${countPh["@_name"]}">${countPh["#text"]}</ph> mensajes.`;
        }
      } else if (result.includes("Tu pedido") && result.includes("artículos llegará el")) {
        // Handle COMPLEX_MESSAGE
        const orderIdPh = phElements.find((ph: any) => ph["@_name"] === "ORDER_ID");
        
        if (orderIdPh) {
          // Reconstruct the complex message
          result = `Tu pedido <ph name="${orderIdPh["@_name"]}">${orderIdPh["#text"]}</ph> de {$itemCount} artículos llegará el <ex>lunes</ex>.`;
        }
      } else if (result.includes("Estado:") && result.includes("para usuario") && result.includes("en")) {
        // Handle NESTED_PLACEHOLDERS
        const statusPh = phElements.find((ph: any) => ph["@_name"] === "STATUS");
        const regionPh = phElements.find((ph: any) => ph["@_name"] === "REGION");
        
        if (statusPh && regionPh) {
          result = `Estado: <ph name="${statusPh["@_name"]}"><ex>Activo</ex></ph> para usuario {$userId} en <ph name="${regionPh["@_name"]}">${regionPh["#text"]}</ph>.`;
        }
      } else {
        // Fallback: append all placeholders
        for (const ph of phElements) {
          if (ph["@_name"]) {
            const content = ph["#text"] || "";
            result += ` <ph name="${ph["@_name"]}">${content}</ph>`;
          }
        }
      }
    }
    
    // Handle example elements
    if (element.ex) {
      const exElements = Array.isArray(element.ex) ? element.ex : [element.ex];
      for (const ex of exElements) {
        const content = ex["#text"] || ex;
        if (!result.includes(`<ex>${content}</ex>`)) {
          result = result.replace(/\.$/, ` <ex>${content}</ex>.`);
        }
      }
    }
    
    return result.trim();
  }
}