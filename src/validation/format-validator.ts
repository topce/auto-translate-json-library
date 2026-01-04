import type { 
  ValidationResult, 
  ValidationError, 
  ValidationWarning,
  IFormatHandler,
  EnhancedTranslationFile 
} from "../format.interface";
import type { TranslationFile } from "../translate.interface";
import { EnhancedValidationResult } from "./enhanced-validation-result";
import { ErrorMessageFormatter, type ErrorMessageContext } from "./error-messages";

export interface FormatValidationRule {
  code: string;
  name: string;
  description: string;
  severity: 'error' | 'warning' | 'info';
  validate: (data: TranslationFile, context?: ValidationContext) => ValidationIssue[];
}

export interface ValidationContext {
  format: string;
  filePath?: string;
  originalContent?: string;
  handler?: IFormatHandler;
  metadata?: any;
}

export interface ValidationIssue {
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  line?: number;
  column?: number;
  path?: string;
  suggestion?: string;
}

export class FormatValidator {
  private static rules: Map<string, FormatValidationRule[]> = new Map();
  private static globalRules: FormatValidationRule[] = [];

  /**
   * Register format-specific validation rules
   */
  static registerFormatRules(format: string, rules: FormatValidationRule[]): void {
    const existingRules = this.rules.get(format) || [];
    this.rules.set(format, [...existingRules, ...rules]);
  }

  /**
   * Register global validation rules that apply to all formats
   */
  static registerGlobalRules(rules: FormatValidationRule[]): void {
    this.globalRules.push(...rules);
  }

  /**
   * Validate translation file data using format-specific and global rules
   */
  static validate(data: TranslationFile, context: ValidationContext): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Apply global rules
    for (const rule of this.globalRules) {
      try {
        const ruleIssues = rule.validate(data, context);
        issues.push(...ruleIssues);
      } catch (error) {
        issues.push({
          code: 'VALIDATION_RULE_ERROR',
          message: ErrorMessageFormatter.formatMessage('VALIDATION_RULE_ERROR', {
            error: error instanceof Error ? error.message : String(error)
          }),
          severity: 'warning'
        });
      }
    }

    // Apply format-specific rules
    const formatRules = this.rules.get(context.format) || [];
    for (const rule of formatRules) {
      try {
        const ruleIssues = rule.validate(data, context);
        issues.push(...ruleIssues);
      } catch (error) {
        issues.push({
          code: 'VALIDATION_RULE_ERROR',
          message: ErrorMessageFormatter.formatMessage('VALIDATION_RULE_ERROR', {
            error: error instanceof Error ? error.message : String(error)
          }),
          severity: 'warning'
        });
      }
    }

    return this.createEnhancedValidationResult(issues, context);
  }

  /**
   * Validate translation file data and return enhanced result with detailed messaging
   */
  static validateWithEnhancedResult(data: TranslationFile, context: ValidationContext): EnhancedValidationResult {
    const basicResult = this.validate(data, context);
    return EnhancedValidationResult.fromValidationResult(basicResult);
  }

  /**
   * Create enhanced validation result from issues
   */
  private static createEnhancedValidationResult(issues: ValidationIssue[], context: ValidationContext): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    for (const issue of issues) {
      const messageContext: ErrorMessageContext = {
        format: context.format,
        filePath: context.filePath,
        line: issue.line,
        column: issue.column,
        path: issue.path,
        ...issue
      };

      const formattedMessage = issue.message || ErrorMessageFormatter.formatMessage(issue.code, messageContext);

      if (issue.severity === 'error') {
        errors.push({
          code: issue.code,
          message: formattedMessage,
          line: issue.line,
          column: issue.column
        });
      } else {
        warnings.push({
          code: issue.code,
          message: formattedMessage,
          line: issue.line,
          column: issue.column
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get all registered rules for a format
   */
  static getFormatRules(format: string): FormatValidationRule[] {
    return this.rules.get(format) || [];
  }

  /**
   * Get all global rules
   */
  static getGlobalRules(): FormatValidationRule[] {
    return [...this.globalRules];
  }

  /**
   * Clear all rules (useful for testing)
   */
  static clearRules(): void {
    this.rules.clear();
    this.globalRules.length = 0;
  }

  /**
   * Validate structure integrity for translation files
   */
  static validateStructureIntegrity(data: TranslationFile, context: ValidationContext): ValidationResult {
    const issues: ValidationIssue[] = [];

    // Basic structure validation
    if (!data || typeof data !== 'object') {
      issues.push({
        code: 'INVALID_STRUCTURE',
        message: 'Translation data must be an object',
        severity: 'error'
      });
      return this.createValidationResult(issues);
    }

    // Check for empty data
    const keys = Object.keys(data).filter(key => !key.startsWith('_'));
    if (keys.length === 0) {
      issues.push({
        code: 'EMPTY_TRANSLATION_FILE',
        message: 'Translation file contains no translatable content',
        severity: 'warning'
      });
    }

    // Validate translatable content
    this.validateTranslatableContent(data, '', issues);

    // Check for circular references
    try {
      JSON.stringify(data);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('circular')) {
        issues.push({
          code: 'CIRCULAR_REFERENCE',
          message: 'Translation data contains circular references',
          severity: 'error'
        });
      }
    }

    return this.createValidationResult(issues);
  }

  private static validateTranslatableContent(
    obj: any, 
    path: string, 
    issues: ValidationIssue[], 
    visited = new Set()
  ): void {
    // Prevent infinite recursion
    if (visited.has(obj)) {
      return;
    }

    if (typeof obj === 'object' && obj !== null) {
      visited.add(obj);
    }

    for (const [key, value] of Object.entries(obj)) {
      // Skip metadata keys
      if (key.startsWith('_')) {
        continue;
      }

      const currentPath = path ? `${path}.${key}` : key;

      if (typeof value === 'string') {
        // String values are translatable - validate string content
        this.validateStringContent(value, currentPath, issues);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Nested objects - recursively validate
        this.validateTranslatableContent(value, currentPath, issues, visited);
      } else if (Array.isArray(value)) {
        // Arrays - validate each element
        value.forEach((item, index) => {
          const arrayPath = `${currentPath}[${index}]`;
          if (typeof item === 'string') {
            this.validateStringContent(item, arrayPath, issues);
          } else if (typeof item === 'object' && item !== null) {
            this.validateTranslatableContent(item, arrayPath, issues, visited);
          } else {
            issues.push({
              code: 'NON_TRANSLATABLE_ARRAY_ITEM',
              message: `Array item at ${arrayPath} is not translatable (${typeof item})`,
              severity: 'warning',
              path: arrayPath
            });
          }
        });
      } else {
        // Non-string, non-object values
        issues.push({
          code: 'NON_TRANSLATABLE_VALUE',
          message: `Value at ${currentPath} is not translatable (${typeof value})`,
          severity: 'warning',
          path: currentPath
        });
      }
    }

    if (typeof obj === 'object' && obj !== null) {
      visited.delete(obj);
    }
  }

  private static validateStringContent(value: string, path: string, issues: ValidationIssue[]): void {
    // Check for empty strings
    if (value.trim().length === 0) {
      issues.push({
        code: 'EMPTY_TRANSLATION_STRING',
        message: `Empty or whitespace-only string at ${path}`,
        severity: 'warning',
        path: path
      });
    }

    // Check for very long strings (potential data issues)
    if (value.length > 10000) {
      issues.push({
        code: 'VERY_LONG_STRING',
        message: `String at ${path} is very long (${value.length} characters) - may indicate data issue`,
        severity: 'info',
        path: path
      });
    }

    // Check for potential HTML/XML content in non-XML formats
    if (this.containsHtmlTags(value)) {
      issues.push({
        code: 'POTENTIAL_HTML_CONTENT',
        message: `String at ${path} contains HTML-like tags - ensure proper escaping`,
        severity: 'info',
        path: path
      });
    }
  }

  private static containsHtmlTags(value: string): boolean {
    const htmlTagPattern = /<[^>]+>/;
    return htmlTagPattern.test(value);
  }

  private static createValidationResult(issues: ValidationIssue[]): ValidationResult {
    const errors: ValidationError[] = issues
      .filter(issue => issue.severity === 'error')
      .map(issue => ({
        code: issue.code,
        message: issue.message,
        line: issue.line,
        column: issue.column
      }));

    const warnings: ValidationWarning[] = issues
      .filter(issue => issue.severity === 'warning' || issue.severity === 'info')
      .map(issue => ({
        code: issue.code,
        message: issue.message,
        line: issue.line,
        column: issue.column
      }));

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }
}