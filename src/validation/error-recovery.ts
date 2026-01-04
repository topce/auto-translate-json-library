import type { TranslationFile } from "../translate.interface";
import type { EnhancedTranslationFile } from "../format.interface";
import { FormatDetector } from "../format-detector";
import { FormatHandlerFactory } from "../format-handler-factory";
import { ErrorMessageFormatter } from "./error-messages";

/**
 * Recovery strategy for handling corrupted or problematic files
 */
export interface RecoveryStrategy {
  name: string;
  description: string;
  canRecover: (error: Error, content: string, filePath?: string) => boolean;
  recover: (error: Error, content: string, filePath?: string) => RecoveryResult;
}

/**
 * Result of a recovery attempt
 */
export interface RecoveryResult {
  success: boolean;
  data?: TranslationFile;
  warnings: string[];
  errors: string[];
  recoveryMethod: string;
  originalError: string;
  partialRecovery?: boolean;
}

/**
 * Error recovery manager that attempts to salvage data from corrupted files
 */
export class ErrorRecoveryManager {
  private static strategies: RecoveryStrategy[] = [];

  /**
   * Register a recovery strategy
   */
  static registerStrategy(strategy: RecoveryStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Attempt to recover data from a corrupted file
   */
  static attemptRecovery(
    error: Error, 
    content: string, 
    filePath?: string
  ): RecoveryResult {
    const applicableStrategies = this.strategies.filter(strategy => 
      strategy.canRecover(error, content, filePath)
    );

    // Try strategies in order of registration
    for (const strategy of applicableStrategies) {
      try {
        const result = strategy.recover(error, content, filePath);
        if (result.success) {
          return result;
        }
      } catch (recoveryError) {
        // Recovery strategy itself failed, continue to next strategy
        console.warn(`Recovery strategy "${strategy.name}" failed:`, recoveryError);
      }
    }

    // No recovery possible
    return {
      success: false,
      warnings: [],
      errors: [`No recovery strategy could handle the error: ${error.message}`],
      recoveryMethod: 'none',
      originalError: error.message
    };
  }

  /**
   * Get all registered recovery strategies
   */
  static getStrategies(): RecoveryStrategy[] {
    return [...this.strategies];
  }

  /**
   * Clear all strategies (useful for testing)
   */
  static clearStrategies(): void {
    this.strategies.length = 0;
  }
}

/**
 * JSON recovery strategies
 */
export const jsonRecoveryStrategies: RecoveryStrategy[] = [
  {
    name: 'JSON Trailing Comma Fix',
    description: 'Remove trailing commas that cause JSON parsing errors',
    canRecover: (error: Error, content: string) => {
      return error.message.includes('JSON') && 
             (content.includes(',}') || content.includes(',]'));
    },
    recover: (error: Error, content: string, filePath?: string): RecoveryResult => {
      try {
        // Remove trailing commas
        let fixedContent = content
          .replace(/,(\s*[}\]])/g, '$1')  // Remove trailing commas before } or ]
          .replace(/,(\s*$)/gm, '');      // Remove trailing commas at end of lines

        const parsed = JSON.parse(fixedContent);
        
        return {
          success: true,
          data: parsed,
          warnings: ['Fixed trailing commas in JSON'],
          errors: [],
          recoveryMethod: 'JSON Trailing Comma Fix',
          originalError: error.message
        };
      } catch (recoveryError) {
        return {
          success: false,
          warnings: [],
          errors: [`Failed to fix trailing commas: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`],
          recoveryMethod: 'JSON Trailing Comma Fix',
          originalError: error.message
        };
      }
    }
  },

  {
    name: 'JSON Comment Removal',
    description: 'Remove comments from JSON files (non-standard but common)',
    canRecover: (error: Error, content: string) => {
      return error.message.includes('JSON') && 
             (content.includes('//') || content.includes('/*'));
    },
    recover: (error: Error, content: string, filePath?: string): RecoveryResult => {
      try {
        // Remove single-line comments
        let fixedContent = content.replace(/\/\/.*$/gm, '');
        
        // Remove multi-line comments
        fixedContent = fixedContent.replace(/\/\*[\s\S]*?\*\//g, '');
        
        const parsed = JSON.parse(fixedContent);
        
        return {
          success: true,
          data: parsed,
          warnings: ['Removed comments from JSON (comments are not standard JSON)'],
          errors: [],
          recoveryMethod: 'JSON Comment Removal',
          originalError: error.message
        };
      } catch (recoveryError) {
        return {
          success: false,
          warnings: [],
          errors: [`Failed to remove comments: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`],
          recoveryMethod: 'JSON Comment Removal',
          originalError: error.message
        };
      }
    }
  },

  {
    name: 'JSON Partial Recovery',
    description: 'Extract valid JSON objects from partially corrupted files',
    canRecover: (error: Error, content: string) => {
      return error.message.includes('JSON') && content.includes('{');
    },
    recover: (error: Error, content: string, filePath?: string): RecoveryResult => {
      const warnings: string[] = [];
      const errors: string[] = [];
      let recoveredData: any = {};

      try {
        // Try to find valid JSON objects in the content
        const lines = content.split('\n');
        let currentObject = '';
        let braceCount = 0;
        let inString = false;
        let escapeNext = false;

        for (const line of lines) {
          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (escapeNext) {
              escapeNext = false;
              currentObject += char;
              continue;
            }
            
            if (char === '\\') {
              escapeNext = true;
              currentObject += char;
              continue;
            }
            
            if (char === '"' && !escapeNext) {
              inString = !inString;
            }
            
            if (!inString) {
              if (char === '{') {
                braceCount++;
              } else if (char === '}') {
                braceCount--;
              }
            }
            
            currentObject += char;
            
            // If we have a complete object, try to parse it
            if (braceCount === 0 && currentObject.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(currentObject.trim());
                if (typeof parsed === 'object' && parsed !== null) {
                  recoveredData = { ...recoveredData, ...parsed };
                  warnings.push(`Recovered partial JSON object`);
                }
              } catch {
                // This chunk wasn't valid JSON, continue
              }
              currentObject = '';
            }
          }
        }

        if (Object.keys(recoveredData).length > 0) {
          return {
            success: true,
            data: recoveredData,
            warnings,
            errors,
            recoveryMethod: 'JSON Partial Recovery',
            originalError: error.message,
            partialRecovery: true
          };
        }
      } catch (recoveryError) {
        errors.push(`Partial recovery failed: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`);
      }

      return {
        success: false,
        warnings,
        errors: errors.length > 0 ? errors : ['No valid JSON objects could be recovered'],
        recoveryMethod: 'JSON Partial Recovery',
        originalError: error.message
      };
    }
  }
];

/**
 * XML recovery strategies
 */
export const xmlRecoveryStrategies: RecoveryStrategy[] = [
  {
    name: 'XML Encoding Fix',
    description: 'Fix common XML encoding issues',
    canRecover: (error: Error, content: string) => {
      return error.message.includes('XML') && 
             error.message.toLowerCase().includes('encoding');
    },
    recover: (error: Error, content: string, filePath?: string): RecoveryResult => {
      try {
        // Try to fix common encoding issues
        let fixedContent = content;
        
        // Fix common encoding declaration issues
        if (!fixedContent.includes('<?xml')) {
          fixedContent = '<?xml version="1.0" encoding="UTF-8"?>\n' + fixedContent;
        }
        
        // Fix malformed encoding declarations
        fixedContent = fixedContent.replace(
          /<\?xml[^>]*encoding\s*=\s*["'][^"']*["'][^>]*\?>/i,
          '<?xml version="1.0" encoding="UTF-8"?>'
        );

        // Try to parse with a simple XML parser approach
        // This is a basic recovery - in a real implementation, you'd use the actual XML parser
        if (fixedContent.includes('<') && fixedContent.includes('>')) {
          return {
            success: true,
            data: { _recovered_xml_content: fixedContent },
            warnings: ['Fixed XML encoding declaration'],
            errors: [],
            recoveryMethod: 'XML Encoding Fix',
            originalError: error.message
          };
        }
      } catch (recoveryError) {
        return {
          success: false,
          warnings: [],
          errors: [`Failed to fix XML encoding: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`],
          recoveryMethod: 'XML Encoding Fix',
          originalError: error.message
        };
      }

      return {
        success: false,
        warnings: [],
        errors: ['Could not fix XML encoding issues'],
        recoveryMethod: 'XML Encoding Fix',
        originalError: error.message
      };
    }
  },

  {
    name: 'XML Unclosed Tag Fix',
    description: 'Attempt to fix unclosed XML tags',
    canRecover: (error: Error, content: string) => {
      return error.message.includes('XML') && 
             (error.message.includes('unclosed') || error.message.includes('not closed'));
    },
    recover: (error: Error, content: string, filePath?: string): RecoveryResult => {
      try {
        const warnings: string[] = [];
        let fixedContent = content;
        
        // Simple approach: find unclosed tags and attempt to close them
        const openTags: string[] = [];
        const tagRegex = /<(\/?)([\w-]+)[^>]*>/g;
        let match;
        
        while ((match = tagRegex.exec(content)) !== null) {
          const isClosing = match[1] === '/';
          const tagName = match[2];
          
          if (isClosing) {
            const lastOpenTag = openTags.pop();
            if (lastOpenTag !== tagName) {
              warnings.push(`Mismatched closing tag: expected ${lastOpenTag}, found ${tagName}`);
            }
          } else {
            // Check if it's a self-closing tag
            if (!match[0].endsWith('/>')) {
              openTags.push(tagName);
            }
          }
        }
        
        // Close any remaining open tags
        for (let i = openTags.length - 1; i >= 0; i--) {
          fixedContent += `</${openTags[i]}>`;
          warnings.push(`Added missing closing tag: ${openTags[i]}`);
        }

        return {
          success: true,
          data: { _recovered_xml_content: fixedContent },
          warnings,
          errors: [],
          recoveryMethod: 'XML Unclosed Tag Fix',
          originalError: error.message,
          partialRecovery: true
        };
      } catch (recoveryError) {
        return {
          success: false,
          warnings: [],
          errors: [`Failed to fix unclosed XML tags: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`],
          recoveryMethod: 'XML Unclosed Tag Fix',
          originalError: error.message
        };
      }
    }
  }
];

/**
 * Format fallback strategies
 */
export const formatFallbackStrategies: RecoveryStrategy[] = [
  {
    name: 'Format Auto-Detection Fallback',
    description: 'Try alternative format detection when primary format fails',
    canRecover: (error: Error, content: string, filePath?: string) => {
      return filePath !== undefined && content.length > 0;
    },
    recover: (error: Error, content: string, filePath?: string): RecoveryResult => {
      try {
        const warnings: string[] = [];
        
        // Try to detect format based on content rather than file extension
        const detectedFormat = FormatDetector.detectFormat(filePath || '', content);
        
        if (detectedFormat === 'unknown') {
          return {
            success: false,
            warnings: [],
            errors: ['Could not detect file format from content'],
            recoveryMethod: 'Format Auto-Detection Fallback',
            originalError: error.message
          };
        }
        
        // Try to get a handler for the detected format
        const handler = FormatHandlerFactory.getHandler(detectedFormat);
        
        if (!handler) {
          return {
            success: false,
            warnings: [],
            errors: [`No handler available for detected format: ${detectedFormat}`],
            recoveryMethod: 'Format Auto-Detection Fallback',
            originalError: error.message
          };
        }
        
        // Try to parse with the detected format handler
        try {
          const data = handler.parse(content);
          warnings.push(`Successfully parsed using ${detectedFormat} format instead of original format`);
          
          return {
            success: true,
            data,
            warnings,
            errors: [],
            recoveryMethod: 'Format Auto-Detection Fallback',
            originalError: error.message
          };
        } catch (parseError) {
          return {
            success: false,
            warnings,
            errors: [`Failed to parse with detected format ${detectedFormat}: ${parseError instanceof Error ? parseError.message : String(parseError)}`],
            recoveryMethod: 'Format Auto-Detection Fallback',
            originalError: error.message
          };
        }
      } catch (recoveryError) {
        return {
          success: false,
          warnings: [],
          errors: [`Format fallback failed: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`],
          recoveryMethod: 'Format Auto-Detection Fallback',
          originalError: error.message
        };
      }
    }
  },

  {
    name: 'Plain Text Fallback',
    description: 'Extract translatable strings from any text content as last resort',
    canRecover: (error: Error, content: string) => {
      return content.length > 0 && typeof content === 'string';
    },
    recover: (error: Error, content: string, filePath?: string): RecoveryResult => {
      try {
        const warnings: string[] = [];
        const lines = content.split('\n');
        const extractedStrings: Record<string, string> = {};
        
        // Extract lines that look like they might contain translatable content
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Skip empty lines and lines that look like code/markup
          if (line.length === 0 || 
              line.startsWith('//') || 
              line.startsWith('#') || 
              line.startsWith('/*') ||
              line.startsWith('<') ||
              line.match(/^[\{\[\(\)\]\}]+$/)) {
            continue;
          }
          
          // Look for quoted strings
          const quotedStrings = line.match(/"([^"\\]|\\.)*"/g) || line.match(/'([^'\\]|\\.)*'/g);
          if (quotedStrings) {
            for (const quotedString of quotedStrings) {
              const cleanString = quotedString.slice(1, -1); // Remove quotes
              if (cleanString.length > 0) {
                extractedStrings[`line_${i + 1}_string_${Object.keys(extractedStrings).length + 1}`] = cleanString;
              }
            }
          } else if (line.length > 3 && !line.match(/^[a-zA-Z_][a-zA-Z0-9_]*\s*[:=]/)) {
            // Lines that don't look like variable assignments might be translatable
            extractedStrings[`line_${i + 1}`] = line;
          }
        }
        
        if (Object.keys(extractedStrings).length > 0) {
          warnings.push(`Extracted ${Object.keys(extractedStrings).length} potential translatable strings from plain text`);
          warnings.push('This is a fallback recovery - please verify the extracted content');
          
          return {
            success: true,
            data: extractedStrings,
            warnings,
            errors: [],
            recoveryMethod: 'Plain Text Fallback',
            originalError: error.message,
            partialRecovery: true
          };
        }
        
        return {
          success: false,
          warnings: [],
          errors: ['No translatable content could be extracted from the file'],
          recoveryMethod: 'Plain Text Fallback',
          originalError: error.message
        };
      } catch (recoveryError) {
        return {
          success: false,
          warnings: [],
          errors: [`Plain text fallback failed: ${recoveryError instanceof Error ? recoveryError.message : String(recoveryError)}`],
          recoveryMethod: 'Plain Text Fallback',
          originalError: error.message
        };
      }
    }
  }
];

/**
 * Initialize all recovery strategies
 */
export function initializeErrorRecovery(): void {
  // Register JSON recovery strategies
  for (const strategy of jsonRecoveryStrategies) {
    ErrorRecoveryManager.registerStrategy(strategy);
  }
  
  // Register XML recovery strategies
  for (const strategy of xmlRecoveryStrategies) {
    ErrorRecoveryManager.registerStrategy(strategy);
  }
  
  // Register format fallback strategies
  for (const strategy of formatFallbackStrategies) {
    ErrorRecoveryManager.registerStrategy(strategy);
  }
}

/**
 * User guidance system for common format issues
 */
export class UserGuidanceSystem {
  private static commonIssues: Map<string, string[]> = new Map([
    ['JSON_PARSE_ERROR', [
      'Check for trailing commas after the last item in objects or arrays',
      'Ensure all strings are properly quoted with double quotes',
      'Verify that all brackets and braces are properly matched',
      'Remove any comments (JSON does not support comments)',
      'Check for unescaped special characters in strings'
    ]],
    
    ['XML_PARSE_ERROR', [
      'Ensure all XML tags are properly closed',
      'Check that the XML declaration is properly formatted',
      'Verify that attribute values are quoted',
      'Ensure there are no unescaped special characters (&, <, >) in text content',
      'Check for proper XML namespace declarations'
    ]],
    
    ['XLIFF_VALIDATION_ERROR', [
      'Verify the XLIFF version is supported (1.2, 2.0, or 2.1)',
      'Ensure all required elements (file, body, trans-unit/unit) are present',
      'Check that source and target languages are specified',
      'Verify that all trans-units have unique IDs'
    ]],
    
    ['ARB_VALIDATION_ERROR', [
      'Add @@locale metadata to specify the language',
      'Check ICU message format syntax for placeholders',
      'Ensure resource metadata matches actual resources',
      'Verify that all ICU plural forms include "other"'
    ]],
    
    ['PO_VALIDATION_ERROR', [
      'Check that the PO file header is present and complete',
      'Verify that msgid and msgstr pairs are properly formatted',
      'Ensure plural forms are correctly specified',
      'Check for proper escaping of quotes and special characters'
    ]],
    
    ['ENCODING_ERROR', [
      'Ensure the file is saved with the correct encoding (usually UTF-8)',
      'Check for byte order marks (BOM) that might cause issues',
      'Verify that special characters are properly encoded',
      'Consider using Unicode escapes for problematic characters'
    ]]
  ]);

  /**
   * Get guidance for a specific error type
   */
  static getGuidance(errorType: string): string[] {
    return this.commonIssues.get(errorType) || [
      'Check the file format and syntax',
      'Verify that the file is not corrupted',
      'Try opening the file in a text editor to inspect its contents',
      'Consider using a format-specific validator or linter'
    ];
  }

  /**
   * Add custom guidance for an error type
   */
  static addGuidance(errorType: string, guidance: string[]): void {
    this.commonIssues.set(errorType, guidance);
  }

  /**
   * Get formatted guidance message
   */
  static getFormattedGuidance(errorType: string, error?: Error): string {
    const guidance = this.getGuidance(errorType);
    const lines = [
      `💡 Suggestions for fixing ${errorType}:`,
      ...guidance.map(item => `  • ${item}`)
    ];
    
    if (error) {
      lines.unshift(`❌ Error: ${error.message}`);
      lines.push('');
    }
    
    return lines.join('\n');
  }
}