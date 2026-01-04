import type { ValidationResult, ValidationError, ValidationWarning } from "../format.interface";
import { ErrorMessageFormatter, type ErrorMessageContext } from "./error-messages";

/**
 * Enhanced validation error with detailed messaging and context
 */
export interface EnhancedValidationError extends ValidationError {
  severity: 'error';
  category?: string;
  suggestion?: string;
  documentation?: string;
  actionable?: boolean;
  context?: ErrorMessageContext;
}

/**
 * Enhanced validation warning with detailed messaging and context
 */
export interface EnhancedValidationWarning extends ValidationWarning {
  severity: 'warning' | 'info';
  category?: string;
  suggestion?: string;
  documentation?: string;
  actionable?: boolean;
  context?: ErrorMessageContext;
}

/**
 * Enhanced validation result with detailed error information and formatting capabilities
 */
export class EnhancedValidationResult implements ValidationResult {
  public readonly isValid: boolean;
  public readonly errors: EnhancedValidationError[];
  public readonly warnings: EnhancedValidationWarning[];

  constructor(
    errors: Array<ValidationError | EnhancedValidationError> = [],
    warnings: Array<ValidationWarning | EnhancedValidationWarning> = []
  ) {
    this.errors = errors.map(error => this.enhanceError(error));
    this.warnings = warnings.map(warning => this.enhanceWarning(warning));
    this.isValid = this.errors.length === 0;
  }

  /**
   * Create from a basic ValidationResult
   */
  static fromValidationResult(result: ValidationResult): EnhancedValidationResult {
    return new EnhancedValidationResult(result.errors, result.warnings);
  }

  /**
   * Get total number of issues (errors + warnings)
   */
  getTotalIssueCount(): number {
    return this.errors.length + this.warnings.length;
  }

  /**
   * Get issues by severity level
   */
  getIssuesBySeverity(severity: 'error' | 'warning' | 'info'): Array<EnhancedValidationError | EnhancedValidationWarning> {
    if (severity === 'error') {
      return this.errors;
    }
    return this.warnings.filter(warning => warning.severity === severity);
  }

  /**
   * Get issues by category
   */
  getIssuesByCategory(category: string): Array<EnhancedValidationError | EnhancedValidationWarning> {
    const allIssues = [...this.errors, ...this.warnings];
    return allIssues.filter(issue => issue.category === category);
  }

  /**
   * Get only actionable issues (those that can be fixed by the user)
   */
  getActionableIssues(): Array<EnhancedValidationError | EnhancedValidationWarning> {
    const allIssues = [...this.errors, ...this.warnings];
    return allIssues.filter(issue => issue.actionable);
  }

  /**
   * Format all issues for display
   */
  formatForDisplay(includeDetails = false): string {
    const lines: string[] = [];
    
    // Add summary
    const summary = ErrorMessageFormatter.createValidationSummary(this.errors, this.warnings);
    lines.push(summary);
    
    if (this.getTotalIssueCount() === 0) {
      return lines.join('\n');
    }
    
    lines.push(''); // Empty line
    
    // Add errors
    if (this.errors.length > 0) {
      lines.push('Errors:');
      for (const error of this.errors) {
        const message = ErrorMessageFormatter.createDisplayMessage(
          error.code, 
          error.context || {}, 
          includeDetails
        );
        lines.push(`  ${message}`);
      }
    }
    
    // Add warnings
    if (this.warnings.length > 0) {
      if (this.errors.length > 0) {
        lines.push(''); // Empty line between errors and warnings
      }
      lines.push('Warnings:');
      for (const warning of this.warnings) {
        const message = ErrorMessageFormatter.createDisplayMessage(
          warning.code, 
          warning.context || {}, 
          includeDetails
        );
        lines.push(`  ${message}`);
      }
    }
    
    return lines.join('\n');
  }

  /**
   * Format issues for JSON output
   */
  toJSON(): {
    isValid: boolean;
    summary: {
      errorCount: number;
      warningCount: number;
      totalIssues: number;
    };
    errors: EnhancedValidationError[];
    warnings: EnhancedValidationWarning[];
  } {
    return {
      isValid: this.isValid,
      summary: {
        errorCount: this.errors.length,
        warningCount: this.warnings.length,
        totalIssues: this.getTotalIssueCount()
      },
      errors: this.errors,
      warnings: this.warnings
    };
  }

  /**
   * Get a brief summary string
   */
  getSummary(): string {
    return ErrorMessageFormatter.createValidationSummary(this.errors, this.warnings);
  }

  /**
   * Check if there are any actionable issues
   */
  hasActionableIssues(): boolean {
    return this.getActionableIssues().length > 0;
  }

  /**
   * Get suggestions for fixing issues
   */
  getSuggestions(): string[] {
    const suggestions: string[] = [];
    const allIssues = [...this.errors, ...this.warnings];
    
    for (const issue of allIssues) {
      if (issue.suggestion && issue.actionable) {
        suggestions.push(`${issue.code}: ${issue.suggestion}`);
      }
    }
    
    return suggestions;
  }

  /**
   * Merge with another validation result
   */
  merge(other: ValidationResult | EnhancedValidationResult): EnhancedValidationResult {
    const otherEnhanced = other instanceof EnhancedValidationResult 
      ? other 
      : EnhancedValidationResult.fromValidationResult(other);
    
    return new EnhancedValidationResult(
      [...this.errors, ...otherEnhanced.errors],
      [...this.warnings, ...otherEnhanced.warnings]
    );
  }

  /**
   * Filter issues by a predicate function
   */
  filter(predicate: (issue: EnhancedValidationError | EnhancedValidationWarning) => boolean): EnhancedValidationResult {
    const allIssues = [...this.errors, ...this.warnings];
    const filteredIssues = allIssues.filter(predicate);
    
    const filteredErrors = filteredIssues.filter(issue => issue.severity === 'error') as EnhancedValidationError[];
    const filteredWarnings = filteredIssues.filter(issue => issue.severity !== 'error') as EnhancedValidationWarning[];
    
    return new EnhancedValidationResult(filteredErrors, filteredWarnings);
  }

  /**
   * Convert to basic ValidationResult for compatibility
   */
  toBasicValidationResult(): ValidationResult {
    return {
      isValid: this.isValid,
      errors: this.errors.map(error => ({
        code: error.code,
        message: error.message,
        line: error.line,
        column: error.column
      })),
      warnings: this.warnings.map(warning => ({
        code: warning.code,
        message: warning.message,
        line: warning.line,
        column: warning.column
      }))
    };
  }

  private enhanceError(error: ValidationError | EnhancedValidationError): EnhancedValidationError {
    if ('severity' in error && error.severity === 'error') {
      return error as EnhancedValidationError;
    }
    
    const template = ErrorMessageFormatter.getErrorDetails(error.code);
    
    return {
      ...error,
      severity: 'error',
      category: template?.category,
      suggestion: template?.suggestion,
      documentation: template?.documentation,
      actionable: template?.actionable,
      context: {
        line: error.line,
        column: error.column
      }
    };
  }

  private enhanceWarning(warning: ValidationWarning | EnhancedValidationWarning): EnhancedValidationWarning {
    if ('severity' in warning && (warning.severity === 'warning' || warning.severity === 'info')) {
      return warning as EnhancedValidationWarning;
    }
    
    const template = ErrorMessageFormatter.getErrorDetails(warning.code);
    
    return {
      ...warning,
      severity: template?.severity === 'info' ? 'info' : 'warning',
      category: template?.category,
      suggestion: template?.suggestion,
      documentation: template?.documentation,
      actionable: template?.actionable,
      context: {
        line: warning.line,
        column: warning.column
      }
    };
  }
}