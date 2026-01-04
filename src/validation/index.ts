import { FormatValidator } from "./format-validator.js";
import { 
  globalValidationRules, 
  formatSpecificRules 
} from "./format-rules.js";
import { initializeErrorRecovery } from "./error-recovery.js";

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
export { FormatValidator } from "./format-validator.js";
export type { 
  FormatValidationRule, 
  ValidationContext, 
  ValidationIssue 
} from "./format-validator.js";

// Export enhanced validation result
export { EnhancedValidationResult } from "./enhanced-validation-result.js";

// Export error messaging
export { ErrorMessageFormatter } from "./error-messages.js";

// Export error recovery
export { 
  ErrorRecoveryManager, 
  UserGuidanceSystem,
  initializeErrorRecovery
} from "./error-recovery.js";
export type { 
  RecoveryStrategy, 
  RecoveryResult 
} from "./error-recovery.js";

// Export validation service
export { ValidationService } from "./validation-service.js";
export type { ValidationServiceResult } from "./validation-service.js";

// Export rule collections for testing or custom usage
export { 
  globalValidationRules, 
  formatSpecificRules 
} from "./format-rules.js";