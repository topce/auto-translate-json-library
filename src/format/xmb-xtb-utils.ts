import type { ValidationResult } from "../format.interface";
import type { TranslationFile } from "../translate.interface";
import { XmbHandler } from "./xmb-handler";
import { XtbHandler } from "./xtb-handler";

/**
 * Utility class for XMB/XTB message bundle operations and integrity validation
 */
export class XmbXtbUtils {
  private xmbHandler: XmbHandler;
  private xtbHandler: XtbHandler;

  constructor() {
    this.xmbHandler = new XmbHandler();
    this.xtbHandler = new XtbHandler();
  }

  /**
   * Validate that XTB translations maintain message integrity with XMB source
   */
  validateBundleIntegrity(
    xmbContent: string, 
    xtbContent: string
  ): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    try {
      // Parse both files
      const xmbData = this.xmbHandler.parse(xmbContent);
      const xtbData = this.xtbHandler.parse(xtbContent);

      // Get message metadata from XMB
      const xmbMetadata = xmbData._metadata?.xmbMetadata?.messages || {};
      
      // Validate each translation against its original message
      for (const [messageId, translatedText] of Object.entries(xtbData)) {
        if (messageId === "_metadata") continue;
        
        const originalMessage = xmbMetadata[messageId];
        if (originalMessage) {
          const originalText = originalMessage.originalText || "";
          const integrity = this.xmbHandler.validateMessageIntegrity(
            originalText, 
            String(translatedText)
          );
          
          errors.push(...integrity.errors);
          warnings.push(...integrity.warnings);
        } else {
          warnings.push({
            code: "ORPHANED_TRANSLATION",
            message: `Translation for message ID "${messageId}" found but no corresponding XMB message`,
          });
        }
      }

      // Check for missing translations
      for (const messageId of Object.keys(xmbData)) {
        if (messageId === "_metadata") continue;
        
        if (!xtbData[messageId]) {
          warnings.push({
            code: "MISSING_TRANSLATION",
            message: `No translation found for message ID "${messageId}"`,
          });
        }
      }

    } catch (error) {
      errors.push({
        code: "BUNDLE_PARSE_ERROR",
        message: `Failed to parse bundle files: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate XTB file from XMB source with translations
   */
  generateXtbFromXmb(
    xmbContent: string, 
    targetLanguage: string, 
    translations: TranslationFile
  ): string {
    return this.xmbHandler.generateXtbFromXmb(xmbContent, targetLanguage, translations);
  }

  /**
   * Update existing XTB file with new translations while preserving structure
   */
  updateXtbFile(existingXtbContent: string, newTranslations: TranslationFile): string {
    return this.xtbHandler.updateXtbTranslations(existingXtbContent, newTranslations);
  }

  /**
   * Extract message descriptions and meanings from XMB for translator context
   */
  extractTranslatorContext(xmbContent: string): Record<string, {
    description?: string;
    meaning?: string;
    originalText: string;
    placeholders: {
      variables: string[];
      phElements: Array<{ name: string; content: string }>;
      examples: string[];
    };
  }> {
    const context: Record<string, any> = {};

    try {
      const xmbData = this.xmbHandler.parse(xmbContent);
      const xmbMetadata = xmbData._metadata?.xmbMetadata?.messages || {};

      for (const [messageId, metadata] of Object.entries(xmbMetadata)) {
        const originalText = (metadata as any).originalText || "";
        
        context[messageId] = {
          description: (metadata as any).description,
          meaning: (metadata as any).meaning,
          originalText,
          placeholders: this.extractPlaceholderInfo(originalText)
        };
      }
    } catch (error) {
      // Return empty context if parsing fails
    }

    return context;
  }

  /**
   * Validate that message references are not broken in bundle structure
   */
  validateMessageReferences(
    xmbContent: string, 
    xtbContent: string
  ): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    try {
      const xmbData = this.xmbHandler.parse(xmbContent);
      const xtbData = this.xtbHandler.parse(xtbContent);

      // Check that XTB language matches expected target
      const xtbLanguage = xtbData._metadata?.xtbMetadata?.language;
      const xmbLanguage = xmbData._metadata?.xmbMetadata?.locale;

      if (xtbLanguage === xmbLanguage) {
        warnings.push({
          code: "SAME_LANGUAGE",
          message: `XTB target language "${xtbLanguage}" is the same as XMB source language "${xmbLanguage}"`,
        });
      }

      // Validate message ID consistency
      const xmbMessageIds = new Set(Object.keys(xmbData).filter(key => key !== "_metadata"));
      const xtbMessageIds = new Set(Object.keys(xtbData).filter(key => key !== "_metadata"));

      // Check for message ID mismatches
      for (const xtbId of xtbMessageIds) {
        if (!xmbMessageIds.has(xtbId)) {
          errors.push({
            code: "INVALID_MESSAGE_REFERENCE",
            message: `XTB contains translation for message ID "${xtbId}" which doesn't exist in XMB source`,
          });
        }
      }

    } catch (error) {
      errors.push({
        code: "REFERENCE_VALIDATION_ERROR",
        message: `Failed to validate message references: ${error instanceof Error ? error.message : String(error)}`,
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

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
}