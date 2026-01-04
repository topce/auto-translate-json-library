import type { 
  IFormatHandler, 
  FormatOptions, 
  ValidationResult, 
  EnhancedTranslationFile 
} from "../format.interface";
import type { TranslationFile } from "../translate.interface";
import { FormatValidator, type ValidationContext, ValidationService } from "../validation";

/**
 * Base class for format handlers that provides common validation functionality
 */
export abstract class BaseFormatHandler implements IFormatHandler {
  abstract canHandle(filePath: string, content?: string): boolean;
  abstract parse(content: string): TranslationFile;
  abstract serialize(data: TranslationFile, options?: FormatOptions): string;
  abstract getFileExtension(): string;
  abstract validateStructure(data: TranslationFile): ValidationResult;

  /**
   * Get the format name for this handler
   */
  protected abstract getFormatName(): string;

  /**
   * Enhanced validation using the centralized validation system
   */
  validateWithRules(data: TranslationFile, filePath?: string, originalContent?: string): ValidationResult {
    const context: ValidationContext = {
      format: this.getFormatName(),
      filePath,
      originalContent,
      handler: this,
      metadata: (data as EnhancedTranslationFile)._metadata
    };

    // Use the centralized validation system
    const centralizedResult = FormatValidator.validate(data, context);
    
    // Also run format-specific validation from the handler
    const handlerResult = this.validateStructure(data);
    
    // Merge results
    return this.mergeValidationResults(centralizedResult, handlerResult);
  }

  /**
   * Comprehensive validation with error recovery
   */
  async validateWithRecovery(
    content: string, 
    filePath?: string,
    options: {
      attemptRecovery?: boolean;
      includeGuidance?: boolean;
      strictMode?: boolean;
    } = {}
  ) {
    return ValidationService.validateFile(content, filePath || 'unknown', this, options);
  }

  /**
   * Merge multiple validation results
   */
  protected mergeValidationResults(...results: ValidationResult[]): ValidationResult {
    const allErrors = results.flatMap(result => result.errors);
    const allWarnings = results.flatMap(result => result.warnings);
    
    // Remove duplicates based on code and message
    const uniqueErrors = this.removeDuplicateIssues(allErrors);
    const uniqueWarnings = this.removeDuplicateIssues(allWarnings);
    
    return {
      isValid: uniqueErrors.length === 0,
      errors: uniqueErrors,
      warnings: uniqueWarnings
    };
  }

  /**
   * Remove duplicate validation issues
   */
  private removeDuplicateIssues<T extends { code: string; message: string }>(issues: T[]): T[] {
    const seen = new Set<string>();
    return issues.filter(issue => {
      const key = `${issue.code}:${issue.message}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Create a validation error
   */
  protected createValidationError(code: string, message: string, line?: number, column?: number) {
    return { code, message, line, column };
  }

  /**
   * Create a validation warning
   */
  protected createValidationWarning(code: string, message: string, line?: number, column?: number) {
    return { code, message, line, column };
  }

  /**
   * Validate that a string contains valid content for translation
   */
  protected validateTranslationString(value: string, path: string): { errors: any[], warnings: any[] } {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Check for empty strings
    if (value.trim().length === 0) {
      warnings.push(this.createValidationWarning(
        'EMPTY_TRANSLATION_STRING',
        `Empty or whitespace-only string at ${path}`
      ));
    }

    // Check for very long strings
    if (value.length > 10000) {
      warnings.push(this.createValidationWarning(
        'VERY_LONG_STRING',
        `String at ${path} is very long (${value.length} characters) - may indicate data issue`
      ));
    }

    // Check for potential control characters
    if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(value)) {
      warnings.push(this.createValidationWarning(
        'CONTROL_CHARACTERS',
        `String at ${path} contains control characters`
      ));
    }

    return { errors, warnings };
  }

  /**
   * Validate object structure recursively
   */
  protected validateObjectStructure(
    obj: any, 
    path = '', 
    visited = new Set()
  ): { errors: any[], warnings: any[] } {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Prevent infinite recursion
    if (visited.has(obj)) {
      return { errors, warnings };
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
        const stringValidation = this.validateTranslationString(value, currentPath);
        errors.push(...stringValidation.errors);
        warnings.push(...stringValidation.warnings);
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const nestedValidation = this.validateObjectStructure(value, currentPath, visited);
        errors.push(...nestedValidation.errors);
        warnings.push(...nestedValidation.warnings);
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          const arrayPath = `${currentPath}[${index}]`;
          if (typeof item === 'string') {
            const stringValidation = this.validateTranslationString(item, arrayPath);
            errors.push(...stringValidation.errors);
            warnings.push(...stringValidation.warnings);
          } else if (typeof item === 'object' && item !== null) {
            const nestedValidation = this.validateObjectStructure(item, arrayPath, visited);
            errors.push(...nestedValidation.errors);
            warnings.push(...nestedValidation.warnings);
          } else {
            warnings.push(this.createValidationWarning(
              'NON_TRANSLATABLE_ARRAY_ITEM',
              `Array item at ${arrayPath} is not translatable (${typeof item})`
            ));
          }
        });
      } else {
        warnings.push(this.createValidationWarning(
          'NON_TRANSLATABLE_VALUE',
          `Value at ${currentPath} is not translatable (${typeof value})`
        ));
      }
    }

    if (typeof obj === 'object' && obj !== null) {
      visited.delete(obj);
    }

    return { errors, warnings };
  }

  /**
   * Check if content appears to be valid for this format
   */
  protected validateContentFormat(content: string): { errors: any[], warnings: any[] } {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic content validation
    if (!content || content.trim().length === 0) {
      errors.push(this.createValidationError(
        'EMPTY_CONTENT',
        'File content is empty'
      ));
    }

    // Check for very large files
    if (content.length > 50 * 1024 * 1024) { // 50MB
      warnings.push(this.createValidationWarning(
        'VERY_LARGE_FILE',
        `File is very large (${Math.round(content.length / 1024 / 1024)}MB) - may cause performance issues`
      ));
    }

    return { errors, warnings };
  }
}