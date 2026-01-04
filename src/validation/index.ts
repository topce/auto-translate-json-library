import { FormatValidator } from "./format-validator";
import { 
  globalValidationRules, 
  formatSpecificRules 
} from "./format-rules";
import { initializeErrorRecovery } from "./error-recovery";

/**
 * Initialize the validation system with all rules and error recovery
 */
export function initializeValidation(): void {
  // Register global rules
  FormatValidator.registerGlobalRules(globalValidationRules);
  
  // Register format-specific rules
  for (const [format, rules] of Object.entries(formatSpecificRules)) {
    if (rules.length > 0) {
      FormatValidator.registerFormatRules(format, rules);
    }
  }
  
  // Initialize error recovery strategies
  initializeErrorRecovery();
}

// Export the main validator and types
export { FormatValidator } from "./format-validator";
export type { 
  FormatValidationRule, 
  ValidationContext, 
  ValidationIssue 
} from "./format-validator";

// Export enhanced validation result
export { EnhancedValidationResult } from "./enhanced-validation-result";

// Export error messaging
export { ErrorMessageFormatter } from "./error-messages";

// Export error recovery
export { 
  ErrorRecoveryManager, 
  UserGuidanceSystem,
  initializeErrorRecovery
} from "./error-recovery";
export type { 
  RecoveryStrategy, 
  RecoveryResult 
} from "./error-recovery";

// Export validation service
export { ValidationService } from "./validation-service";
export type { ValidationServiceResult } from "./validation-service";

// Export rule collections for testing or custom usage
export { 
  globalValidationRules, 
  formatSpecificRules 
} from "./format-rules";