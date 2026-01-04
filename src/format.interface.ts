import type { TranslationFile } from "./translate.interface";

export interface FormatOptions {
  preserveFormatting?: boolean;
  encoding?: string;
  indentation?: string | number;
  xmlDeclaration?: boolean;
  namespace?: string;
  customSettings?: Record<string, any>;
}

export interface ValidationError {
  code: string;
  message: string;
  line?: number;
  column?: number;
}

export interface ValidationWarning {
  code: string;
  message: string;
  line?: number;
  column?: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface IFormatHandler {
  canHandle(filePath: string, content?: string): boolean;
  parse(content: string): TranslationFile;
  serialize(data: TranslationFile, options?: FormatOptions): string;
  getFileExtension(): string;
  validateStructure(data: TranslationFile): ValidationResult;
  
  /**
   * Enhanced validation using the centralized validation system
   * This method should be preferred over validateStructure for comprehensive validation
   */
  validateWithRules?(data: TranslationFile, filePath?: string, originalContent?: string): ValidationResult;
}

export interface EnhancedTranslationFile extends TranslationFile {
  _metadata?: {
    format: string;
    version?: string;
    sourceLanguage?: string;
    targetLanguage?: string;
    encoding?: string;
    originalStructure?: any;
    preserveComments?: boolean;
    preserveAttributes?: boolean;
    // ARB-specific metadata
    arbMetadata?: Record<string, string | undefined>;
    resourceMetadata?: Record<string, any>;
    icuAnalysis?: Record<string, any>;
    // XLIFF-specific metadata
    xliffVersion?: string;
    xliffMetadata?: any;
    // Additional format-specific metadata can be added here
    [key: string]: any;
  };
}