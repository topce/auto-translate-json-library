import type { TranslationFile } from "../translate.interface";
import type { IFormatHandler, ValidationResult } from "../format.interface";
import { FormatValidator, type ValidationContext } from "./format-validator";
import { EnhancedValidationResult } from "./enhanced-validation-result";
import { ErrorRecoveryManager, UserGuidanceSystem, type RecoveryResult } from "./error-recovery";
import { ErrorMessageFormatter } from "./error-messages";

/**
 * Comprehensive validation and recovery service
 */
export class ValidationService {
  /**
   * Validate a translation file with comprehensive error handling and recovery
   */
  static async validateFile(
    content: string,
    filePath: string,
    handler: IFormatHandler,
    options: {
      attemptRecovery?: boolean;
      includeGuidance?: boolean;
      strictMode?: boolean;
    } = {}
  ): Promise<ValidationServiceResult> {
    const {
      attemptRecovery = true,
      includeGuidance = true,
      strictMode = false
    } = options;

    let data: TranslationFile;
    let parseError: Error | null = null;
    let recoveryResult: RecoveryResult | null = null;

    // Attempt to parse the file
    try {
      data = handler.parse(content);
    } catch (error) {
      parseError = error instanceof Error ? error : new Error(String(error));
      
      if (!attemptRecovery) {
        return {
          success: false,
          validationResult: new EnhancedValidationResult([{
            code: 'PARSE_ERROR',
            message: `Failed to parse file: ${parseError.message}`,
            line: undefined,
            column: undefined
          }], []),
          parseError,
          recoveryResult: null,
          guidance: includeGuidance ? this.getParseErrorGuidance(parseError, filePath) : undefined
        };
      }

      // Attempt recovery
      recoveryResult = ErrorRecoveryManager.attemptRecovery(parseError, content, filePath);
      
      if (!recoveryResult.success) {
        return {
          success: false,
          validationResult: new EnhancedValidationResult([{
            code: 'PARSE_ERROR',
            message: `Failed to parse file and recovery failed: ${parseError.message}`,
            line: undefined,
            column: undefined
          }], []),
          parseError,
          recoveryResult,
          guidance: includeGuidance ? this.getParseErrorGuidance(parseError, filePath) : undefined
        };
      }

      data = recoveryResult.data!;
    }

    // Validate the parsed data
    const context: ValidationContext = {
      format: this.getFormatFromHandler(handler),
      filePath,
      originalContent: content,
      handler
    };

    let validationResult: EnhancedValidationResult;
    
    if (handler.validateWithRules) {
      const result = handler.validateWithRules(data, filePath, content);
      validationResult = EnhancedValidationResult.fromValidationResult(result);
    } else {
      const result = FormatValidator.validate(data, context);
      validationResult = EnhancedValidationResult.fromValidationResult(result);
    }

    // In strict mode, treat warnings as errors
    if (strictMode && validationResult.warnings.length > 0) {
      const strictErrors = validationResult.warnings.map(warning => ({
        ...warning,
        severity: 'error' as const
      }));
      
      validationResult = new EnhancedValidationResult(
        [...validationResult.errors, ...strictErrors],
        []
      );
    }

    const success = validationResult.isValid && (parseError === null || recoveryResult?.success === true);

    return {
      success,
      data,
      validationResult,
      parseError,
      recoveryResult,
      guidance: includeGuidance ? this.getValidationGuidance(validationResult, context) : undefined
    };
  }

  /**
   * Validate translation data without parsing (for already parsed data)
   */
  static validateData(
    data: TranslationFile,
    context: ValidationContext,
    options: {
      includeGuidance?: boolean;
      strictMode?: boolean;
    } = {}
  ): ValidationServiceResult {
    const { includeGuidance = true, strictMode = false } = options;

    let validationResult = EnhancedValidationResult.fromValidationResult(
      FormatValidator.validate(data, context)
    );

    // In strict mode, treat warnings as errors
    if (strictMode && validationResult.warnings.length > 0) {
      const strictErrors = validationResult.warnings.map(warning => ({
        ...warning,
        severity: 'error' as const
      }));
      
      validationResult = new EnhancedValidationResult(
        [...validationResult.errors, ...strictErrors],
        []
      );
    }

    return {
      success: validationResult.isValid,
      data,
      validationResult,
      parseError: null,
      recoveryResult: null,
      guidance: includeGuidance ? this.getValidationGuidance(validationResult, context) : undefined
    };
  }

  /**
   * Get format name from handler
   */
  private static getFormatFromHandler(handler: IFormatHandler): string {
    const extension = handler.getFileExtension();
    return extension.replace('.', '');
  }

  /**
   * Get guidance for parse errors
   */
  private static getParseErrorGuidance(error: Error, filePath?: string): string {
    const errorMessage = error.message.toLowerCase();
    
    let errorType = 'PARSE_ERROR';
    if (errorMessage.includes('json')) {
      errorType = 'JSON_PARSE_ERROR';
    } else if (errorMessage.includes('xml')) {
      errorType = 'XML_PARSE_ERROR';
    } else if (errorMessage.includes('xliff')) {
      errorType = 'XLIFF_VALIDATION_ERROR';
    } else if (errorMessage.includes('encoding')) {
      errorType = 'ENCODING_ERROR';
    }

    return UserGuidanceSystem.getFormattedGuidance(errorType, error);
  }

  /**
   * Get guidance for validation issues
   */
  private static getValidationGuidance(
    result: EnhancedValidationResult, 
    context: ValidationContext
  ): string | undefined {
    if (result.getTotalIssueCount() === 0) {
      return undefined;
    }

    const lines: string[] = [];
    
    // Add summary
    lines.push(result.getSummary());
    lines.push('');

    // Add actionable suggestions
    const suggestions = result.getSuggestions();
    if (suggestions.length > 0) {
      lines.push('💡 Suggestions:');
      for (const suggestion of suggestions.slice(0, 5)) { // Limit to top 5 suggestions
        lines.push(`  • ${suggestion}`);
      }
      lines.push('');
    }

    // Add format-specific guidance
    const formatGuidance = this.getFormatSpecificGuidance(context.format, result);
    if (formatGuidance) {
      lines.push(formatGuidance);
    }

    return lines.join('\n');
  }

  /**
   * Get format-specific guidance
   */
  private static getFormatSpecificGuidance(
    format: string, 
    result: EnhancedValidationResult
  ): string | undefined {
    const errorCodes = result.errors.map(error => error.code);
    const warningCodes = result.warnings.map(warning => warning.code);
    const allCodes = [...errorCodes, ...warningCodes];

    // Check for format-specific error patterns
    if (format === 'json' && allCodes.some(code => code.includes('JSON'))) {
      return UserGuidanceSystem.getFormattedGuidance('JSON_PARSE_ERROR');
    }
    
    if (format === 'xliff' && allCodes.some(code => code.includes('XLIFF'))) {
      return UserGuidanceSystem.getFormattedGuidance('XLIFF_VALIDATION_ERROR');
    }
    
    if (format === 'arb' && allCodes.some(code => code.includes('ARB'))) {
      return UserGuidanceSystem.getFormattedGuidance('ARB_VALIDATION_ERROR');
    }
    
    if (format === 'po' && allCodes.some(code => code.includes('PO'))) {
      return UserGuidanceSystem.getFormattedGuidance('PO_VALIDATION_ERROR');
    }

    return undefined;
  }

  /**
   * Create a validation report for CLI or logging
   */
  static createValidationReport(result: ValidationServiceResult): string {
    const lines: string[] = [];
    
    // Header
    lines.push('='.repeat(60));
    lines.push('TRANSLATION FILE VALIDATION REPORT');
    lines.push('='.repeat(60));
    lines.push('');

    // Overall status
    const statusIcon = result.success ? '✅' : '❌';
    lines.push(`Status: ${statusIcon} ${result.success ? 'PASSED' : 'FAILED'}`);
    lines.push('');

    // Parse information
    if (result.parseError) {
      lines.push('📄 Parse Status:');
      lines.push(`  ❌ Parse Error: ${result.parseError.message}`);
      
      if (result.recoveryResult) {
        const recoveryIcon = result.recoveryResult.success ? '✅' : '❌';
        lines.push(`  ${recoveryIcon} Recovery: ${result.recoveryResult.recoveryMethod}`);
        
        if (result.recoveryResult.success) {
          lines.push(`     ${result.recoveryResult.partialRecovery ? 'Partial' : 'Full'} recovery successful`);
        }
      }
      lines.push('');
    }

    // Validation results
    if (result.validationResult) {
      lines.push('🔍 Validation Results:');
      lines.push(`  Errors: ${result.validationResult.errors.length}`);
      lines.push(`  Warnings: ${result.validationResult.warnings.length}`);
      lines.push('');

      // Detailed issues
      if (result.validationResult.errors.length > 0) {
        lines.push('❌ Errors:');
        for (const error of result.validationResult.errors) {
          lines.push(`  • [${error.code}] ${error.message}`);
        }
        lines.push('');
      }

      if (result.validationResult.warnings.length > 0) {
        lines.push('⚠️ Warnings:');
        for (const warning of result.validationResult.warnings) {
          lines.push(`  • [${warning.code}] ${warning.message}`);
        }
        lines.push('');
      }
    }

    // Guidance
    if (result.guidance) {
      lines.push('📋 Guidance:');
      lines.push(result.guidance.split('\n').map(line => `  ${line}`).join('\n'));
      lines.push('');
    }

    lines.push('='.repeat(60));
    
    return lines.join('\n');
  }
}

/**
 * Result of validation service operation
 */
export interface ValidationServiceResult {
  success: boolean;
  data?: TranslationFile;
  validationResult: EnhancedValidationResult;
  parseError: Error | null;
  recoveryResult: RecoveryResult | null;
  guidance?: string;
}