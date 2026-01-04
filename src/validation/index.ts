import { initializeErrorRecovery } from "./error-recovery.js";
import { formatSpecificRules, globalValidationRules } from "./format-rules.js";
import { FormatValidator } from "./format-validator.js";

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

// Export enhanced validation result
export { EnhancedValidationResult } from "./enhanced-validation-result.js";
// Export error messaging
export { ErrorMessageFormatter } from "./error-messages.js";
export type {
  RecoveryResult,
  RecoveryStrategy,
} from "./error-recovery.js";
// Export error recovery
export {
  ErrorRecoveryManager,
  initializeErrorRecovery,
  UserGuidanceSystem,
} from "./error-recovery.js";
// Export rule collections for testing or custom usage
export {
  formatSpecificRules,
  globalValidationRules,
} from "./format-rules.js";
export type {
  FormatValidationRule,
  ValidationContext,
  ValidationIssue,
} from "./format-validator.js";
// Export the main validator and types
export { FormatValidator } from "./format-validator.js";
export type { ValidationServiceResult } from "./validation-service.js";
// Export validation service
export { ValidationService } from "./validation-service.js";
