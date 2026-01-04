/**
 * Error message templates and localization support for validation errors
 */

export interface ErrorMessageTemplate {
  code: string;
  template: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  category: 'structure' | 'format' | 'content' | 'syntax' | 'metadata';
  actionable: boolean;
  suggestion?: string;
  documentation?: string;
}

export interface ErrorMessageContext {
  format?: string;
  filePath?: string;
  line?: number;
  column?: number;
  value?: any;
  expected?: any;
  actual?: any;
  [key: string]: any;
}

/**
 * Error message templates organized by category
 */
export const errorMessageTemplates: Record<string, ErrorMessageTemplate> = {
  // Structure errors
  'INVALID_STRUCTURE': {
    code: 'INVALID_STRUCTURE',
    template: 'Invalid file structure: {message}',
    description: 'The file structure does not conform to the expected format',
    severity: 'error',
    category: 'structure',
    actionable: true,
    suggestion: 'Ensure the file follows the correct format specification'
  },
  
  'EMPTY_TRANSLATION_FILE': {
    code: 'EMPTY_TRANSLATION_FILE',
    template: 'Translation file is empty or contains no translatable content',
    description: 'The file does not contain any translatable strings',
    severity: 'warning',
    category: 'content',
    actionable: true,
    suggestion: 'Add translatable content to the file'
  },
  
  'CIRCULAR_REFERENCE': {
    code: 'CIRCULAR_REFERENCE',
    template: 'Circular reference detected in translation data',
    description: 'The translation data contains circular object references',
    severity: 'error',
    category: 'structure',
    actionable: true,
    suggestion: 'Remove circular references from the data structure'
  },

  // Format-specific errors
  'JSON_CIRCULAR_REFERENCE': {
    code: 'JSON_CIRCULAR_REFERENCE',
    template: 'JSON data contains circular references that cannot be serialized',
    description: 'JSON format does not support circular object references',
    severity: 'error',
    category: 'format',
    actionable: true,
    suggestion: 'Restructure the data to avoid circular references'
  },

  'JSON_DEEP_NESTING': {
    code: 'JSON_DEEP_NESTING',
    template: 'JSON structure is deeply nested (depth > {maxDepth}) at {path}',
    description: 'Excessive nesting can cause performance issues and make the file hard to maintain',
    severity: 'warning',
    category: 'structure',
    actionable: true,
    suggestion: 'Consider flattening the structure or breaking it into smaller files'
  },

  // XLIFF-specific errors
  'XLIFF_MISSING_VERSION': {
    code: 'XLIFF_MISSING_VERSION',
    template: 'XLIFF file is missing version information',
    description: 'XLIFF files should specify their version for proper processing',
    severity: 'warning',
    category: 'metadata',
    actionable: true,
    suggestion: 'Add version attribute to the XLIFF root element (e.g., version="1.2")'
  },

  'XLIFF_INVALID_VERSION': {
    code: 'XLIFF_INVALID_VERSION',
    template: 'Unsupported XLIFF version: {version}. Supported versions are {supportedVersions}',
    description: 'The XLIFF version is not supported by this tool',
    severity: 'error',
    category: 'format',
    actionable: true,
    suggestion: 'Use a supported XLIFF version (1.2, 2.0, or 2.1)'
  },

  'XLIFF_MISSING_SOURCE_LANGUAGE': {
    code: 'XLIFF_MISSING_SOURCE_LANGUAGE',
    template: 'XLIFF file should specify source language information',
    description: 'Source language helps with proper translation processing',
    severity: 'warning',
    category: 'metadata',
    actionable: true,
    suggestion: 'Add source-language attribute to the file element'
  },

  'XLIFF_MISSING_TARGET_LANGUAGE': {
    code: 'XLIFF_MISSING_TARGET_LANGUAGE',
    template: 'XLIFF file should specify target language information',
    description: 'Target language helps with proper translation processing',
    severity: 'warning',
    category: 'metadata',
    actionable: true,
    suggestion: 'Add target-language attribute to the file element'
  },

  // ARB-specific errors
  'ARB_MISSING_LOCALE': {
    code: 'ARB_MISSING_LOCALE',
    template: 'ARB file should contain @@locale metadata to specify the language',
    description: 'The @@locale metadata helps identify the language of the ARB file',
    severity: 'warning',
    category: 'metadata',
    actionable: true,
    suggestion: 'Add "@@locale": "language_code" to the ARB file (e.g., "en", "es_ES")'
  },

  'ARB_INVALID_LOCALE': {
    code: 'ARB_INVALID_LOCALE',
    template: 'Invalid locale format: "{locale}". Expected format: language[_COUNTRY]',
    description: 'Locale codes should follow standard language and country code format',
    severity: 'warning',
    category: 'metadata',
    actionable: true,
    suggestion: 'Use format like "en", "en_US", "es_ES", "fr_CA"'
  },

  'ARB_ICU_SYNTAX_ERROR': {
    code: 'ARB_ICU_SYNTAX_ERROR',
    template: 'ICU message format syntax error in "{path}": {error}',
    description: 'The ICU message format syntax is invalid and may cause runtime errors',
    severity: 'error',
    category: 'syntax',
    actionable: true,
    suggestion: 'Fix the ICU syntax error. Common issues: unmatched brackets, missing commas, invalid placeholders',
    documentation: 'https://unicode-org.github.io/icu/userguide/format_parse/messages/'
  },

  'ARB_ORPHANED_METADATA': {
    code: 'ARB_ORPHANED_METADATA',
    template: 'Resource metadata @{resourceName} has no corresponding resource',
    description: 'Metadata exists for a resource that is not defined',
    severity: 'warning',
    category: 'metadata',
    actionable: true,
    suggestion: 'Either add the missing resource or remove the orphaned metadata'
  },

  // PO-specific errors
  'PO_MISSING_HEADER': {
    code: 'PO_MISSING_HEADER',
    template: 'PO file should contain header information for proper processing',
    description: 'PO file headers contain important metadata like language, encoding, and plural forms',
    severity: 'warning',
    category: 'metadata',
    actionable: true,
    suggestion: 'Add PO file header with Language, Content-Type, and Plural-Forms fields'
  },

  'PO_UNTRANSLATED_STRINGS': {
    code: 'PO_UNTRANSLATED_STRINGS',
    template: 'Found {count} untranslated strings in PO file',
    description: 'Some strings in the PO file have not been translated',
    severity: 'info',
    category: 'content',
    actionable: true,
    suggestion: 'Complete the translation of remaining strings'
  },

  // Content validation errors
  'EMPTY_TRANSLATION_STRING': {
    code: 'EMPTY_TRANSLATION_STRING',
    template: 'Empty or whitespace-only translation string at {path}',
    description: 'Translation strings should contain meaningful content',
    severity: 'warning',
    category: 'content',
    actionable: true,
    suggestion: 'Provide a translation for this string or remove it if not needed'
  },

  'VERY_LONG_STRING': {
    code: 'VERY_LONG_STRING',
    template: 'Translation string at {path} is very long ({length} characters)',
    description: 'Very long strings may indicate data issues or poor user experience',
    severity: 'info',
    category: 'content',
    actionable: false,
    suggestion: 'Consider breaking long text into smaller, more manageable pieces'
  },

  'CONTROL_CHARACTERS': {
    code: 'CONTROL_CHARACTERS',
    template: 'Translation string at {path} contains control characters',
    description: 'Control characters may cause display or processing issues',
    severity: 'warning',
    category: 'content',
    actionable: true,
    suggestion: 'Remove or properly escape control characters'
  },

  'NON_TRANSLATABLE_VALUE': {
    code: 'NON_TRANSLATABLE_VALUE',
    template: 'Value at {path} is not translatable ({type})',
    description: 'Only string values should be translated',
    severity: 'warning',
    category: 'content',
    actionable: false,
    suggestion: 'Non-string values will be preserved as-is during translation'
  },

  // Key validation errors
  'DUPLICATE_KEYS': {
    code: 'DUPLICATE_KEYS',
    template: 'Duplicate translation key found: {key}',
    description: 'Duplicate keys can cause conflicts and unpredictable behavior',
    severity: 'error',
    category: 'structure',
    actionable: true,
    suggestion: 'Ensure all translation keys are unique'
  },

  'KEY_CONTAINS_SPACES': {
    code: 'KEY_CONTAINS_SPACES',
    template: 'Translation key "{key}" contains spaces',
    description: 'Keys with spaces may cause issues in some systems',
    severity: 'warning',
    category: 'structure',
    actionable: true,
    suggestion: 'Consider using underscores, camelCase, or kebab-case instead of spaces'
  },

  'KEY_INVALID_DASH': {
    code: 'KEY_INVALID_DASH',
    template: 'Translation key "{key}" starts or ends with dash',
    description: 'Keys starting or ending with dashes may cause parsing issues',
    severity: 'warning',
    category: 'structure',
    actionable: true,
    suggestion: 'Remove leading or trailing dashes from the key'
  },

  'KEY_SPECIAL_CHARACTERS': {
    code: 'KEY_SPECIAL_CHARACTERS',
    template: 'Translation key "{key}" contains special characters',
    description: 'Special characters in keys may cause compatibility issues',
    severity: 'info',
    category: 'structure',
    actionable: false,
    suggestion: 'Consider using only alphanumeric characters, dots, underscores, and dashes'
  },

  // Properties-specific errors
  'PROPERTIES_UNESCAPED_UNICODE': {
    code: 'PROPERTIES_UNESCAPED_UNICODE',
    template: 'Unescaped Unicode characters in Properties key "{key}"',
    description: 'Properties files may require Unicode escaping for non-ASCII characters',
    severity: 'warning',
    category: 'format',
    actionable: true,
    suggestion: 'Use Unicode escapes (\\uXXXX) for non-ASCII characters or ensure UTF-8 encoding'
  },

  // YAML-specific errors
  'YAML_NON_STRING_VALUE': {
    code: 'YAML_NON_STRING_VALUE',
    template: 'Non-string value at {path} ({type}) in YAML file',
    description: 'Only string values should be translated in YAML files',
    severity: 'warning',
    category: 'content',
    actionable: false,
    suggestion: 'Non-string values will be preserved as-is during translation'
  },

  // CSV-specific errors
  'CSV_NO_DATA': {
    code: 'CSV_NO_DATA',
    template: 'CSV file contains no data rows',
    description: 'CSV file should contain at least one data row',
    severity: 'error',
    category: 'content',
    actionable: true,
    suggestion: 'Add data rows to the CSV file'
  },

  'CSV_INCONSISTENT_COLUMNS': {
    code: 'CSV_INCONSISTENT_COLUMNS',
    template: 'CSV file has inconsistent number of columns',
    description: 'All rows in a CSV file should have the same number of columns',
    severity: 'error',
    category: 'structure',
    actionable: true,
    suggestion: 'Ensure all rows have the same number of columns'
  },

  // Generic validation errors
  'VALIDATION_RULE_ERROR': {
    code: 'VALIDATION_RULE_ERROR',
    template: 'Validation rule failed: {error}',
    description: 'An error occurred while running a validation rule',
    severity: 'warning',
    category: 'structure',
    actionable: false,
    suggestion: 'This may indicate a bug in the validation system'
  },

  'EMPTY_CONTENT': {
    code: 'EMPTY_CONTENT',
    template: 'File content is empty',
    description: 'The file does not contain any content',
    severity: 'error',
    category: 'content',
    actionable: true,
    suggestion: 'Add content to the file'
  },

  'VERY_LARGE_FILE': {
    code: 'VERY_LARGE_FILE',
    template: 'File is very large ({size}MB) and may cause performance issues',
    description: 'Large files may take longer to process and consume more memory',
    severity: 'warning',
    category: 'content',
    actionable: false,
    suggestion: 'Consider breaking large files into smaller chunks'
  }
};

/**
 * Error message formatter with template interpolation and localization support
 */
export class ErrorMessageFormatter {
  private static locale = 'en';
  private static customTemplates: Record<string, ErrorMessageTemplate> = {};

  /**
   * Set the locale for error messages (for future localization)
   */
  static setLocale(locale: string): void {
    this.locale = locale;
  }

  /**
   * Register custom error message templates
   */
  static registerCustomTemplates(templates: Record<string, ErrorMessageTemplate>): void {
    Object.assign(this.customTemplates, templates);
  }

  /**
   * Format an error message with context interpolation
   */
  static formatMessage(code: string, context: ErrorMessageContext = {}): string {
    const template = this.customTemplates[code] || errorMessageTemplates[code];
    
    if (!template) {
      return `Unknown error: ${code}`;
    }

    return this.interpolateTemplate(template.template, context);
  }

  /**
   * Get detailed error information including suggestions and documentation
   */
  static getErrorDetails(code: string): ErrorMessageTemplate | null {
    return this.customTemplates[code] || errorMessageTemplates[code] || null;
  }

  /**
   * Format a complete error message with details and suggestions
   */
  static formatDetailedMessage(code: string, context: ErrorMessageContext = {}): string {
    const template = this.getErrorDetails(code);
    
    if (!template) {
      return `Unknown error: ${code}`;
    }

    let message = this.interpolateTemplate(template.template, context);
    
    if (template.suggestion) {
      message += `\n  Suggestion: ${template.suggestion}`;
    }
    
    if (template.documentation) {
      message += `\n  Documentation: ${template.documentation}`;
    }
    
    return message;
  }

  /**
   * Get error severity level
   */
  static getErrorSeverity(code: string): 'error' | 'warning' | 'info' {
    const template = this.getErrorDetails(code);
    return template?.severity || 'error';
  }

  /**
   * Check if an error is actionable (can be fixed by the user)
   */
  static isActionable(code: string): boolean {
    const template = this.getErrorDetails(code);
    return template?.actionable || false;
  }

  /**
   * Get errors by category
   */
  static getErrorsByCategory(category: string): ErrorMessageTemplate[] {
    const allTemplates = { ...errorMessageTemplates, ...this.customTemplates };
    return Object.values(allTemplates).filter(template => template.category === category);
  }

  /**
   * Interpolate template variables with context values
   */
  private static interpolateTemplate(template: string, context: ErrorMessageContext): string {
    return template.replace(/\{(\w+)\}/g, (match, key) => {
      const value = context[key];
      if (value !== undefined) {
        return String(value);
      }
      return match; // Keep placeholder if no value provided
    });
  }

  /**
   * Create a formatted error message for display in CLI or UI
   */
  static createDisplayMessage(
    code: string, 
    context: ErrorMessageContext = {},
    includeDetails = false
  ): string {
    const template = this.getErrorDetails(code);
    
    if (!template) {
      return `[${code}] Unknown error`;
    }

    const severityIcon = this.getSeverityIcon(template.severity);
    const message = this.interpolateTemplate(template.template, context);
    
    let displayMessage = `${severityIcon} [${code}] ${message}`;
    
    if (context.filePath) {
      displayMessage += ` (${context.filePath}`;
      if (context.line) {
        displayMessage += `:${context.line}`;
        if (context.column) {
          displayMessage += `:${context.column}`;
        }
      }
      displayMessage += ')';
    }
    
    if (includeDetails && template.suggestion) {
      displayMessage += `\n    💡 ${template.suggestion}`;
    }
    
    return displayMessage;
  }

  /**
   * Get icon for severity level
   */
  private static getSeverityIcon(severity: 'error' | 'warning' | 'info'): string {
    switch (severity) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '❓';
    }
  }

  /**
   * Create a summary of validation results
   */
  static createValidationSummary(
    errors: Array<{ code: string; message: string }>,
    warnings: Array<{ code: string; message: string }>
  ): string {
    const errorCount = errors.length;
    const warningCount = warnings.length;
    
    if (errorCount === 0 && warningCount === 0) {
      return '✅ No validation issues found';
    }
    
    let summary = '';
    
    if (errorCount > 0) {
      summary += `❌ ${errorCount} error${errorCount === 1 ? '' : 's'}`;
    }
    
    if (warningCount > 0) {
      if (summary) summary += ', ';
      summary += `⚠️ ${warningCount} warning${warningCount === 1 ? '' : 's'}`;
    }
    
    return summary;
  }
}