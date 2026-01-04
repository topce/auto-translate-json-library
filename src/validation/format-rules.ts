import type { FormatValidationRule, ValidationContext, ValidationIssue } from "./format-validator";
import type { TranslationFile } from "../translate.interface";
import type { EnhancedTranslationFile } from "../format.interface";

/**
 * Global validation rules that apply to all formats
 */
export const globalValidationRules: FormatValidationRule[] = [
  {
    code: 'EMPTY_TRANSLATION_FILE',
    name: 'Empty Translation File',
    description: 'Check for empty translation files',
    severity: 'warning',
    validate: (data: TranslationFile): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      const keys = Object.keys(data).filter(key => !key.startsWith('_'));
      
      if (keys.length === 0) {
        issues.push({
          code: 'EMPTY_TRANSLATION_FILE',
          message: 'Translation file contains no translatable content',
          severity: 'warning'
        });
      }
      
      return issues;
    }
  },
  {
    code: 'DUPLICATE_KEYS',
    name: 'Duplicate Translation Keys',
    description: 'Check for duplicate translation keys',
    severity: 'error',
    validate: (data: TranslationFile): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      const seenKeys = new Set<string>();
      const duplicates = new Set<string>();
      
      const checkKeys = (obj: any, path = ''): void => {
        for (const [key, value] of Object.entries(obj)) {
          if (key.startsWith('_')) continue;
          
          const fullKey = path ? `${path}.${key}` : key;
          
          if (seenKeys.has(fullKey)) {
            duplicates.add(fullKey);
          } else {
            seenKeys.add(fullKey);
          }
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            checkKeys(value, fullKey);
          }
        }
      };
      
      checkKeys(data);
      
      for (const duplicate of duplicates) {
        issues.push({
          code: 'DUPLICATE_KEYS',
          message: `Duplicate translation key found: ${duplicate}`,
          severity: 'error',
          path: duplicate
        });
      }
      
      return issues;
    }
  },
  {
    code: 'INVALID_KEY_FORMAT',
    name: 'Invalid Key Format',
    description: 'Check for invalid translation key formats',
    severity: 'warning',
    validate: (data: TranslationFile): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      
      const validateKeyFormat = (obj: any, path = ''): void => {
        for (const [key, value] of Object.entries(obj)) {
          if (key.startsWith('_')) continue;
          
          const fullKey = path ? `${path}.${key}` : key;
          
          // Check for problematic key patterns
          if (key.includes(' ')) {
            issues.push({
              code: 'KEY_CONTAINS_SPACES',
              message: `Translation key "${fullKey}" contains spaces`,
              severity: 'warning',
              path: fullKey,
              suggestion: 'Consider using underscores or camelCase instead of spaces'
            });
          }
          
          if (key.startsWith('-') || key.endsWith('-')) {
            issues.push({
              code: 'KEY_INVALID_DASH',
              message: `Translation key "${fullKey}" starts or ends with dash`,
              severity: 'warning',
              path: fullKey
            });
          }
          
          if (/[^a-zA-Z0-9._\-\[\]]/.test(key)) {
            issues.push({
              code: 'KEY_SPECIAL_CHARACTERS',
              message: `Translation key "${fullKey}" contains special characters`,
              severity: 'info',
              path: fullKey
            });
          }
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            validateKeyFormat(value, fullKey);
          }
        }
      };
      
      validateKeyFormat(data);
      return issues;
    }
  }
];

/**
 * JSON format validation rules
 */
export const jsonValidationRules: FormatValidationRule[] = [
  {
    code: 'JSON_CIRCULAR_REFERENCE',
    name: 'JSON Circular Reference',
    description: 'Check for circular references in JSON data',
    severity: 'error',
    validate: (data: TranslationFile): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      
      try {
        JSON.stringify(data);
      } catch (error) {
        if (error instanceof TypeError && error.message.includes('circular')) {
          issues.push({
            code: 'JSON_CIRCULAR_REFERENCE',
            message: 'JSON data contains circular references',
            severity: 'error'
          });
        }
      }
      
      return issues;
    }
  },
  {
    code: 'JSON_DEEP_NESTING',
    name: 'JSON Deep Nesting',
    description: 'Check for excessively deep nesting in JSON',
    severity: 'warning',
    validate: (data: TranslationFile): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      const maxDepth = 10;
      
      const checkDepth = (obj: any, currentDepth = 0, path = ''): void => {
        if (currentDepth > maxDepth) {
          issues.push({
            code: 'JSON_DEEP_NESTING',
            message: `JSON structure is deeply nested (depth > ${maxDepth}) at ${path}`,
            severity: 'warning',
            path: path
          });
          return;
        }
        
        for (const [key, value] of Object.entries(obj)) {
          if (key.startsWith('_')) continue;
          
          const fullPath = path ? `${path}.${key}` : key;
          
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            checkDepth(value, currentDepth + 1, fullPath);
          }
        }
      };
      
      checkDepth(data);
      return issues;
    }
  }
];

/**
 * XLIFF format validation rules
 */
export const xliffValidationRules: FormatValidationRule[] = [
  {
    code: 'XLIFF_MISSING_VERSION',
    name: 'XLIFF Missing Version',
    description: 'Check for missing XLIFF version',
    severity: 'warning',
    validate: (data: TranslationFile, context?: ValidationContext): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      const enhancedData = data as EnhancedTranslationFile;
      
      if (!enhancedData._metadata?.version) {
        issues.push({
          code: 'XLIFF_MISSING_VERSION',
          message: 'XLIFF file should specify version information',
          severity: 'warning'
        });
      }
      
      return issues;
    }
  },
  {
    code: 'XLIFF_INVALID_VERSION',
    name: 'XLIFF Invalid Version',
    description: 'Check for invalid XLIFF version',
    severity: 'error',
    validate: (data: TranslationFile): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      const enhancedData = data as EnhancedTranslationFile;
      const version = enhancedData._metadata?.version;
      
      if (version && !['1.2', '2.0', '2.1'].includes(version)) {
        issues.push({
          code: 'XLIFF_INVALID_VERSION',
          message: `Unsupported XLIFF version: ${version}`,
          severity: 'error',
          suggestion: 'Supported versions are 1.2, 2.0, and 2.1'
        });
      }
      
      return issues;
    }
  },
  {
    code: 'XLIFF_MISSING_LANGUAGES',
    name: 'XLIFF Missing Languages',
    description: 'Check for missing source/target language information',
    severity: 'warning',
    validate: (data: TranslationFile): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      const enhancedData = data as EnhancedTranslationFile;
      
      if (!enhancedData._metadata?.sourceLanguage) {
        issues.push({
          code: 'XLIFF_MISSING_SOURCE_LANGUAGE',
          message: 'XLIFF file should specify source language',
          severity: 'warning'
        });
      }
      
      if (!enhancedData._metadata?.targetLanguage) {
        issues.push({
          code: 'XLIFF_MISSING_TARGET_LANGUAGE',
          message: 'XLIFF file should specify target language',
          severity: 'warning'
        });
      }
      
      return issues;
    }
  }
];

/**
 * ARB format validation rules
 */
export const arbValidationRules: FormatValidationRule[] = [
  {
    code: 'ARB_MISSING_LOCALE',
    name: 'ARB Missing Locale',
    description: 'Check for missing @@locale metadata',
    severity: 'warning',
    validate: (data: TranslationFile): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      const enhancedData = data as EnhancedTranslationFile;
      
      if (!enhancedData._metadata?.arbMetadata?.['@@locale']) {
        issues.push({
          code: 'ARB_MISSING_LOCALE',
          message: 'ARB file should contain @@locale metadata',
          severity: 'warning',
          suggestion: 'Add @@locale metadata to specify the language code'
        });
      }
      
      return issues;
    }
  },
  {
    code: 'ARB_INVALID_LOCALE',
    name: 'ARB Invalid Locale',
    description: 'Check for invalid locale format',
    severity: 'warning',
    validate: (data: TranslationFile): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      const enhancedData = data as EnhancedTranslationFile;
      const locale = enhancedData._metadata?.arbMetadata?.['@@locale'];
      
      if (locale && !/^[a-z]{2,3}(_[A-Z]{2})?$/.test(locale)) {
        issues.push({
          code: 'ARB_INVALID_LOCALE',
          message: `Invalid locale format: ${locale}`,
          severity: 'warning',
          suggestion: 'Use format like "en", "en_US", "es_ES"'
        });
      }
      
      return issues;
    }
  },
  {
    code: 'ARB_ICU_SYNTAX_ERROR',
    name: 'ARB ICU Syntax Error',
    description: 'Check for ICU message format syntax errors',
    severity: 'error',
    validate: (data: TranslationFile): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      
      const validateIcuSyntax = (obj: any, path = ''): void => {
        for (const [key, value] of Object.entries(obj)) {
          if (key.startsWith('_') || key.startsWith('@')) continue;
          
          const fullPath = path ? `${path}.${key}` : key;
          
          if (typeof value === 'string') {
            const icuErrors = validateIcuMessage(value);
            for (const error of icuErrors) {
              issues.push({
                code: 'ARB_ICU_SYNTAX_ERROR',
                message: `ICU syntax error in "${fullPath}": ${error}`,
                severity: 'error',
                path: fullPath
              });
            }
          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            validateIcuSyntax(value, fullPath);
          }
        }
      };
      
      validateIcuSyntax(data);
      return issues;
    }
  },
  {
    code: 'ARB_ORPHANED_METADATA',
    name: 'ARB Orphaned Metadata',
    description: 'Check for metadata without corresponding resources',
    severity: 'warning',
    validate: (data: TranslationFile): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      const resourceKeys = new Set<string>();
      const metadataKeys = new Set<string>();
      
      // Collect resource and metadata keys
      for (const key of Object.keys(data)) {
        if (key.startsWith('@') && !key.startsWith('@@')) {
          metadataKeys.add(key.substring(1));
        } else if (!key.startsWith('@') && !key.startsWith('_')) {
          resourceKeys.add(key);
        }
      }
      
      // Check for orphaned metadata
      for (const metadataKey of metadataKeys) {
        if (!resourceKeys.has(metadataKey)) {
          issues.push({
            code: 'ARB_ORPHANED_METADATA',
            message: `Resource metadata @${metadataKey} has no corresponding resource`,
            severity: 'warning',
            path: `@${metadataKey}`
          });
        }
      }
      
      return issues;
    }
  }
];

/**
 * PO format validation rules
 */
export const poValidationRules: FormatValidationRule[] = [
  {
    code: 'PO_MISSING_HEADER',
    name: 'PO Missing Header',
    description: 'Check for missing PO file header information',
    severity: 'warning',
    validate: (data: TranslationFile, context?: ValidationContext): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      const enhancedData = data as EnhancedTranslationFile;
      
      // Check if we have header information in metadata
      if (!enhancedData._metadata?.originalStructure?.headers) {
        issues.push({
          code: 'PO_MISSING_HEADER',
          message: 'PO file should contain header information',
          severity: 'warning'
        });
      }
      
      return issues;
    }
  },
  {
    code: 'PO_UNTRANSLATED_STRINGS',
    name: 'PO Untranslated Strings',
    description: 'Check for untranslated strings in PO files',
    severity: 'info',
    validate: (data: TranslationFile): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      let untranslatedCount = 0;
      
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith('_')) continue;
        
        if (typeof value === 'string' && value.trim() === '') {
          untranslatedCount++;
        }
      }
      
      if (untranslatedCount > 0) {
        issues.push({
          code: 'PO_UNTRANSLATED_STRINGS',
          message: `Found ${untranslatedCount} untranslated strings`,
          severity: 'info'
        });
      }
      
      return issues;
    }
  }
];

/**
 * YAML format validation rules
 */
export const yamlValidationRules: FormatValidationRule[] = [
  {
    code: 'YAML_MIXED_TYPES',
    name: 'YAML Mixed Types',
    description: 'Check for mixed data types in YAML values',
    severity: 'warning',
    validate: (data: TranslationFile): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      
      const checkTypes = (obj: any, path = ''): void => {
        for (const [key, value] of Object.entries(obj)) {
          if (key.startsWith('_')) continue;
          
          const fullPath = path ? `${path}.${key}` : key;
          
          if (typeof value !== 'string' && typeof value !== 'object') {
            issues.push({
              code: 'YAML_NON_STRING_VALUE',
              message: `Non-string value at ${fullPath} (${typeof value})`,
              severity: 'warning',
              path: fullPath,
              suggestion: 'Only string values should be translated'
            });
          } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            checkTypes(value, fullPath);
          }
        }
      };
      
      checkTypes(data);
      return issues;
    }
  }
];

/**
 * Properties format validation rules
 */
export const propertiesValidationRules: FormatValidationRule[] = [
  {
    code: 'PROPERTIES_ENCODING_ISSUE',
    name: 'Properties Encoding Issue',
    description: 'Check for potential encoding issues in Properties files',
    severity: 'warning',
    validate: (data: TranslationFile): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      
      for (const [key, value] of Object.entries(data)) {
        if (key.startsWith('_')) continue;
        
        if (typeof value === 'string') {
          // Check for unescaped Unicode characters
          if (/[^\x00-\x7F]/.test(value) && !/\\u[0-9a-fA-F]{4}/.test(value)) {
            issues.push({
              code: 'PROPERTIES_UNESCAPED_UNICODE',
              message: `Unescaped Unicode characters in "${key}"`,
              severity: 'warning',
              path: key,
              suggestion: 'Consider using Unicode escapes (\\uXXXX) for non-ASCII characters'
            });
          }
        }
      }
      
      return issues;
    }
  }
];

/**
 * CSV format validation rules
 */
export const csvValidationRules: FormatValidationRule[] = [
  {
    code: 'CSV_INCONSISTENT_COLUMNS',
    name: 'CSV Inconsistent Columns',
    description: 'Check for inconsistent column structure in CSV',
    severity: 'error',
    validate: (data: TranslationFile, context?: ValidationContext): ValidationIssue[] => {
      const issues: ValidationIssue[] = [];
      const enhancedData = data as EnhancedTranslationFile;
      
      // This would need to be implemented based on CSV-specific metadata
      // For now, just check basic structure
      if (Object.keys(data).length === 0) {
        issues.push({
          code: 'CSV_NO_DATA',
          message: 'CSV file contains no data',
          severity: 'error'
        });
      }
      
      return issues;
    }
  }
];

/**
 * Helper function to validate ICU message syntax
 */
function validateIcuMessage(message: string): string[] {
  const errors: string[] = [];
  
  // Check bracket matching
  let depth = 0;
  let inQuotes = false;
  
  for (let i = 0; i < message.length; i++) {
    const char = message[i];
    const prevChar = i > 0 ? message[i - 1] : '';
    
    if (char === "'" && prevChar !== '\\') {
      inQuotes = !inQuotes;
    } else if (!inQuotes) {
      if (char === '{') {
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth < 0) {
          errors.push('Mismatched closing bracket');
          break;
        }
      }
    }
  }
  
  if (depth !== 0) {
    errors.push('Unmatched opening brackets');
  }
  
  // Check for unmatched quotes
  const unescapedQuotes = message.match(/(?<!\\)'/g);
  if (unescapedQuotes && unescapedQuotes.length % 2 !== 0) {
    errors.push('Unmatched single quotes');
  }
  
  // Check for invalid placeholder syntax
  if (/\{[^}]*[{}][^}]*\}/.test(message)) {
    errors.push('Invalid placeholder syntax');
  }
  
  return errors;
}

/**
 * Export all format-specific rules
 */
export const formatSpecificRules: Record<string, FormatValidationRule[]> = {
  json: jsonValidationRules,
  xliff: xliffValidationRules,
  arb: arbValidationRules,
  po: poValidationRules,
  pot: poValidationRules, // PO and POT share the same rules
  yaml: yamlValidationRules,
  yml: yamlValidationRules, // YAML and YML share the same rules
  properties: propertiesValidationRules,
  csv: csvValidationRules,
  tsv: csvValidationRules, // CSV and TSV share the same rules
  xml: [], // Basic XML rules would go here
  xmb: [], // XMB-specific rules would go here
  xtb: []  // XTB-specific rules would go here
};