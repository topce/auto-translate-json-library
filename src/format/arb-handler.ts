import * as path from "node:path";
import type { 
  IFormatHandler, 
  FormatOptions, 
  ValidationResult, 
  EnhancedTranslationFile 
} from "../format.interface";
import type { TranslationFile } from "../translate.interface";

interface ArbMetadata {
  "@@locale"?: string;
  "@@last_modified"?: string;
  "@@author"?: string;
  "@@context"?: string;
  [key: string]: string | undefined;
}

interface ArbResourceMetadata {
  type?: string;
  description?: string;
  placeholders?: Record<string, {
    type?: string;
    example?: string;
    description?: string;
  }>;
  context?: string;
}

interface IcuMessageInfo {
  hasIcuSyntax: boolean;
  placeholders: string[];
  pluralForms?: string[];
  selectOptions?: string[];
  messageType: 'simple' | 'plural' | 'select' | 'complex';
}

export class ArbHandler implements IFormatHandler {
  canHandle(filePath: string, content?: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    if (extension !== ".arb") {
      return false;
    }

    // If content is provided, check for ARB-specific structure
    if (content) {
      try {
        const parsed = JSON.parse(content);
        // ARB files should have @@locale metadata or resource metadata patterns
        return this.isValidArbStructure(parsed);
      } catch {
        return false;
      }
    }

    return true;
  }

  parse(content: string): EnhancedTranslationFile {
    try {
      const parsed = JSON.parse(content);
      
      if (!this.isValidArbStructure(parsed)) {
        throw new Error("Invalid ARB file structure");
      }

      // Separate ARB metadata from translatable content
      const { metadata, resources, resourceMetadata } = this.extractArbComponents(parsed);
      
      // Analyze ICU message formats in resources
      const icuAnalysis = this.analyzeIcuMessages(resources);
      
      // Create flattened structure for translation
      const result: EnhancedTranslationFile = {
        ...resources,
        _metadata: {
          format: "arb",
          originalStructure: parsed,
          sourceLanguage: metadata["@@locale"],
          preserveComments: false,
          preserveAttributes: true,
          arbMetadata: metadata,
          resourceMetadata: resourceMetadata,
          icuAnalysis: icuAnalysis,
        }
      };

      return result;
    } catch (error) {
      throw new Error(`Failed to parse ARB: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  serialize(data: EnhancedTranslationFile, options?: FormatOptions): string {
    try {
      const { _metadata, ...translatedResources } = data;
      
      // Reconstruct ARB structure with proper ordering
      const result: any = {};
      
      // 1. Add ARB metadata first (@@locale, @@last_modified, etc.)
      if (_metadata?.arbMetadata) {
        // Ensure @@locale comes first if present
        if (_metadata.arbMetadata["@@locale"]) {
          result["@@locale"] = _metadata.arbMetadata["@@locale"];
        }
        
        // Add other ARB metadata in sorted order
        const otherMetadata = Object.entries(_metadata.arbMetadata)
          .filter(([key]) => key !== "@@locale")
          .sort(([a], [b]) => a.localeCompare(b));
          
        for (const [key, value] of otherMetadata) {
          result[key] = value;
        }
        
        // Update @@last_modified if preserving timestamps
        if (options?.customSettings?.updateTimestamp !== false) {
          result["@@last_modified"] = new Date().toISOString();
        }
      }
      
      // 2. Add translated resources in sorted order
      const sortedResources = Object.entries(translatedResources)
        .sort(([a], [b]) => a.localeCompare(b));
        
      for (const [key, value] of sortedResources) {
        result[key] = value;
      }
      
      // 3. Add resource metadata (@resourceName entries) in sorted order
      if (_metadata?.resourceMetadata) {
        const sortedMetadata = Object.entries(_metadata.resourceMetadata)
          .sort(([a], [b]) => a.localeCompare(b));
          
        for (const [key, value] of sortedMetadata) {
          // Ensure metadata is properly structured
          result[key] = this.sanitizeResourceMetadata(value);
        }
      }

      // Apply formatting options
      const indentation = this.getIndentation(options);
      
      return JSON.stringify(result, null, indentation);
    } catch (error) {
      throw new Error(`Failed to serialize ARB: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getFileExtension(): string {
    return ".arb";
  }

  validateStructure(data: TranslationFile): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic structure validation
    if (!data || typeof data !== "object") {
      errors.push({
        code: "INVALID_STRUCTURE",
        message: "ARB data must be an object",
      });
      return { isValid: false, errors, warnings };
    }

    // Check for required ARB metadata
    const hasLocaleMetadata = "@@locale" in data;
    if (!hasLocaleMetadata) {
      warnings.push({
        code: "MISSING_LOCALE_METADATA",
        message: "ARB file should contain @@locale metadata",
      });
    }

    // Validate ARB metadata format
    this.validateArbMetadata(data, errors, warnings);
    
    // Validate resource structure
    this.validateResourceStructure(data, errors, warnings);
    
    // Validate ICU message formats
    this.validateIcuMessages(data, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private isValidArbStructure(parsed: any): boolean {
    if (!parsed || typeof parsed !== "object") {
      return false;
    }

    // Check for ARB-specific patterns
    const hasArbMetadata = Object.keys(parsed).some(key => key.startsWith("@@"));
    const hasResourceMetadata = Object.keys(parsed).some(key => key.startsWith("@") && !key.startsWith("@@"));
    
    // ARB files should have either ARB metadata or resource metadata
    return hasArbMetadata || hasResourceMetadata || this.hasArbResourcePattern(parsed);
  }

  private hasArbResourcePattern(parsed: any): boolean {
    // Look for typical ARB resource patterns
    const keys = Object.keys(parsed);
    return keys.some(key => {
      const metadataKey = `@${key}`;
      return metadataKey in parsed;
    });
  }

  private extractArbComponents(parsed: any): {
    metadata: ArbMetadata;
    resources: Record<string, string>;
    resourceMetadata: Record<string, ArbResourceMetadata>;
  } {
    const metadata: ArbMetadata = {};
    const resources: Record<string, string> = {};
    const resourceMetadata: Record<string, ArbResourceMetadata> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (key.startsWith("@@")) {
        // ARB metadata - preserve all ARB-specific metadata
        metadata[key as keyof ArbMetadata] = value as string;
      } else if (key.startsWith("@")) {
        // Resource metadata - validate and preserve structure
        resourceMetadata[key] = this.validateAndPreserveResourceMetadata(key, value);
      } else {
        // Translatable resource
        if (typeof value === "string") {
          resources[key] = value;
        } else {
          // Non-string values in ARB should be preserved as metadata
          console.warn(`Non-string resource "${key}" found in ARB file, treating as metadata`);
        }
      }
    }

    return { metadata, resources, resourceMetadata };
  }

  private validateAndPreserveResourceMetadata(key: string, value: any): ArbResourceMetadata {
    if (typeof value !== "object" || value === null) {
      console.warn(`Invalid resource metadata for ${key}, creating empty metadata object`);
      return {};
    }

    const metadata: ArbResourceMetadata = {};
    
    // Preserve known metadata properties
    if (value.type !== undefined) {
      metadata.type = String(value.type);
    }
    
    if (value.description !== undefined) {
      metadata.description = String(value.description);
    }
    
    if (value.context !== undefined) {
      metadata.context = String(value.context);
    }
    
    // Preserve placeholders with validation
    if (value.placeholders && typeof value.placeholders === "object") {
      metadata.placeholders = this.preservePlaceholderMetadata(value.placeholders);
    }
    
    // Preserve any additional properties (for extensibility)
    for (const [prop, propValue] of Object.entries(value)) {
      if (!["type", "description", "context", "placeholders"].includes(prop)) {
        (metadata as any)[prop] = propValue;
      }
    }

    return metadata;
  }

  private preservePlaceholderMetadata(placeholders: any): Record<string, any> {
    const preserved: Record<string, any> = {};
    
    for (const [placeholderName, placeholderData] of Object.entries(placeholders)) {
      if (typeof placeholderData === "object" && placeholderData !== null) {
        preserved[placeholderName] = { ...placeholderData };
      } else {
        console.warn(`Invalid placeholder metadata for ${placeholderName}`);
        preserved[placeholderName] = {};
      }
    }
    
    return preserved;
  }

  private sanitizeResourceMetadata(metadata: any): ArbResourceMetadata {
    if (typeof metadata !== "object" || metadata === null) {
      return {};
    }

    const sanitized: ArbResourceMetadata = {};
    
    // Ensure string properties are strings
    if (metadata.type !== undefined) {
      sanitized.type = String(metadata.type);
    }
    
    if (metadata.description !== undefined) {
      sanitized.description = String(metadata.description);
    }
    
    if (metadata.context !== undefined) {
      sanitized.context = String(metadata.context);
    }
    
    // Preserve placeholders structure
    if (metadata.placeholders && typeof metadata.placeholders === "object") {
      sanitized.placeholders = {};
      for (const [name, data] of Object.entries(metadata.placeholders)) {
        if (typeof data === "object" && data !== null) {
          sanitized.placeholders[name] = { ...data };
        }
      }
    }
    
    return sanitized;
  }

  private validateArbMetadata(data: any, errors: any[], warnings: any[]): void {
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith("@@")) {
        if (typeof value !== "string") {
          errors.push({
            code: "INVALID_METADATA_TYPE",
            message: `ARB metadata ${key} must be a string, got ${typeof value}`,
          });
        }
        
        // Validate specific metadata
        if (key === "@@locale" && typeof value === "string") {
          if (!this.isValidLocaleCode(value)) {
            warnings.push({
              code: "INVALID_LOCALE_FORMAT",
              message: `Locale code "${value}" may not be in standard format`,
            });
          }
        }
      }
    }
  }

  private validateResourceStructure(data: any, errors: any[], warnings: any[]): void {
    const resourceKeys = new Set<string>();
    const metadataKeys = new Set<string>();

    // Collect resource and metadata keys
    for (const key of Object.keys(data)) {
      if (key.startsWith("@") && !key.startsWith("@@")) {
        metadataKeys.add(key.substring(1));
      } else if (!key.startsWith("@")) {
        resourceKeys.add(key);
      }
    }

    // Check for orphaned metadata (metadata without corresponding resource)
    for (const metadataKey of metadataKeys) {
      if (!resourceKeys.has(metadataKey)) {
        warnings.push({
          code: "ORPHANED_METADATA",
          message: `Resource metadata @${metadataKey} has no corresponding resource`,
        });
      }
    }

    // Check for resources without metadata (informational)
    for (const resourceKey of resourceKeys) {
      if (!metadataKeys.has(resourceKey)) {
        // This is not an error, just informational
        const resourceValue = data[resourceKey];
        if (typeof resourceValue === "string" && this.analyzeIcuMessage(resourceValue).hasIcuSyntax) {
          warnings.push({
            code: "MISSING_METADATA_FOR_ICU",
            message: `Resource "${resourceKey}" contains ICU syntax but has no metadata`,
          });
        }
      }
    }

    // Validate resource metadata structure
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith("@") && !key.startsWith("@@")) {
        this.validateResourceMetadata(key, value, errors, warnings);
      }
    }

    // Validate resource-metadata consistency
    this.validateResourceMetadataConsistency(data, errors, warnings);
  }

  private validateResourceMetadata(key: string, metadata: any, errors: any[], warnings: any[]): void {
    if (typeof metadata !== "object" || metadata === null) {
      errors.push({
        code: "INVALID_RESOURCE_METADATA",
        message: `Resource metadata ${key} must be an object`,
      });
      return;
    }

    // Validate known metadata properties
    const validProperties = ["type", "description", "placeholders", "context"];
    for (const prop of Object.keys(metadata)) {
      if (!validProperties.includes(prop)) {
        warnings.push({
          code: "UNKNOWN_METADATA_PROPERTY",
          message: `Unknown metadata property "${prop}" in ${key}`,
        });
      }
    }

    // Validate placeholders structure
    if ("placeholders" in metadata) {
      this.validatePlaceholders(key, metadata.placeholders, errors, warnings);
    }
  }

  private validatePlaceholders(resourceKey: string, placeholders: any, errors: any[], warnings: any[]): void {
    if (typeof placeholders !== "object" || placeholders === null) {
      errors.push({
        code: "INVALID_PLACEHOLDERS",
        message: `Placeholders in ${resourceKey} must be an object`,
      });
      return;
    }

    for (const [placeholderName, placeholderData] of Object.entries(placeholders)) {
      if (typeof placeholderData !== "object" || placeholderData === null) {
        errors.push({
          code: "INVALID_PLACEHOLDER_DATA",
          message: `Placeholder "${placeholderName}" in ${resourceKey} must be an object`,
        });
        continue;
      }

      // Validate placeholder properties
      const validPlaceholderProps = ["type", "example", "description"];
      for (const prop of Object.keys(placeholderData as object)) {
        if (!validPlaceholderProps.includes(prop)) {
          warnings.push({
            code: "UNKNOWN_PLACEHOLDER_PROPERTY",
            message: `Unknown placeholder property "${prop}" in ${resourceKey}.${placeholderName}`,
          });
        }
      }
    }
  }

  private validateIcuMessages(data: any, errors: any[], warnings: any[]): void {
    for (const [key, value] of Object.entries(data)) {
      // Skip metadata keys
      if (key.startsWith("@")) {
        continue;
      }

      if (typeof value === "string") {
        this.validateIcuMessageSyntax(key, value, errors, warnings);
      }
    }
  }

  private validateIcuMessageSyntax(key: string, message: string, errors: any[], warnings: any[]): void {
    const icuInfo = this.analyzeIcuMessage(message);
    
    if (!icuInfo.hasIcuSyntax) {
      return; // No ICU syntax to validate
    }

    // Validate bracket matching
    if (!this.validateBracketMatching(message)) {
      errors.push({
        code: "ICU_BRACKET_MISMATCH",
        message: `ICU message in "${key}" has mismatched brackets`,
      });
    }

    // Validate plural forms
    if (icuInfo.messageType === 'plural' && icuInfo.pluralForms) {
      if (!icuInfo.pluralForms.includes('other')) {
        errors.push({
          code: "ICU_MISSING_OTHER_PLURAL",
          message: `ICU plural message in "${key}" must include 'other' form`,
        });
      }
    }

    // Validate select forms
    if (icuInfo.messageType === 'select' && icuInfo.selectOptions) {
      if (!icuInfo.selectOptions.includes('other')) {
        warnings.push({
          code: "ICU_MISSING_OTHER_SELECT",
          message: `ICU select message in "${key}" should include 'other' option`,
        });
      }
    }

    // Check for common ICU syntax errors
    this.validateIcuSyntaxErrors(key, message, errors, warnings);
  }

  private validateBracketMatching(message: string): boolean {
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
            return false; // More closing than opening brackets
          }
        }
      }
    }
    
    return depth === 0; // All brackets should be matched
  }

  private validateIcuSyntaxErrors(key: string, message: string, errors: any[], warnings: any[]): void {
    // Check for common syntax errors
    
    // Unescaped single quotes in ICU messages
    const unescapedQuotePattern = /(?<!\\)'/g;
    const quotes = message.match(unescapedQuotePattern);
    if (quotes && quotes.length % 2 !== 0) {
      warnings.push({
        code: "ICU_UNMATCHED_QUOTES",
        message: `ICU message in "${key}" may have unmatched single quotes`,
      });
    }

    // Invalid placeholder syntax
    const invalidPlaceholderPattern = /\{[^}]*[{}][^}]*\}/g;
    if (invalidPlaceholderPattern.test(message)) {
      errors.push({
        code: "ICU_INVALID_PLACEHOLDER",
        message: `ICU message in "${key}" contains invalid placeholder syntax`,
      });
    }

    // Missing comma in complex placeholders
    const complexPlaceholderPattern = /\{[^,}]+\s+(plural|select)\s*[^,]/g;
    if (complexPlaceholderPattern.test(message)) {
      errors.push({
        code: "ICU_MISSING_COMMA",
        message: `ICU message in "${key}" is missing comma in complex placeholder`,
      });
    }
  }

  private validateResourceMetadataConsistency(data: any, errors: any[], warnings: any[]): void {
    for (const [key, value] of Object.entries(data)) {
      // Skip metadata keys
      if (key.startsWith("@")) {
        continue;
      }

      if (typeof value === "string") {
        const metadataKey = `@${key}`;
        const metadata = data[metadataKey];
        
        // Check if resource has ICU syntax but no metadata at all
        const icuInfo = this.analyzeIcuMessage(value);
        if (icuInfo.hasIcuSyntax && !metadata) {
          warnings.push({
            code: "MISSING_PLACEHOLDER_METADATA",
            message: `Resource "${key}" uses ICU placeholders but has no placeholder metadata`,
          });
        } else if (metadata) {
          this.validatePlaceholderConsistency(key, value, metadata, errors, warnings);
        }
      }
    }
  }

  private validatePlaceholderConsistency(resourceKey: string, message: string, metadata: any, errors: any[], warnings: any[]): void {
    const icuInfo = this.analyzeIcuMessage(message);
    
    if (!icuInfo.hasIcuSyntax) {
      // If no ICU syntax but metadata has placeholders, warn
      if (metadata.placeholders && Object.keys(metadata.placeholders).length > 0) {
        warnings.push({
          code: "METADATA_PLACEHOLDER_MISMATCH",
          message: `Resource "${resourceKey}" has placeholder metadata but no ICU placeholders in message`,
        });
      }
      return;
    }

    // Check if metadata placeholders match ICU placeholders
    if (metadata.placeholders) {
      const metadataPlaceholders = Object.keys(metadata.placeholders);
      const messagePlaceholders = icuInfo.placeholders;

      // Check for missing placeholders in metadata
      for (const placeholder of messagePlaceholders) {
        if (!metadataPlaceholders.includes(placeholder)) {
          warnings.push({
            code: "MISSING_PLACEHOLDER_METADATA",
            message: `Resource "${resourceKey}" uses placeholder "{${placeholder}}" but has no metadata for it`,
          });
        }
      }

      // Check for extra placeholders in metadata
      for (const placeholder of metadataPlaceholders) {
        if (!messagePlaceholders.includes(placeholder)) {
          warnings.push({
            code: "EXTRA_PLACEHOLDER_METADATA",
            message: `Resource "${resourceKey}" has metadata for placeholder "{${placeholder}}" but doesn't use it`,
          });
        }
      }
    } else if (icuInfo.placeholders.length > 0) {
      // ICU placeholders exist but no metadata
      warnings.push({
        code: "MISSING_PLACEHOLDER_METADATA",
        message: `Resource "${resourceKey}" uses ICU placeholders but has no placeholder metadata`,
      });
    }
  }

  private isValidLocaleCode(locale: string): boolean {
    // Basic locale code validation (language-country format)
    const localePattern = /^[a-z]{2,3}(_[A-Z]{2})?$/;
    return localePattern.test(locale);
  }

  private analyzeIcuMessages(resources: Record<string, string>): Record<string, IcuMessageInfo> {
    const analysis: Record<string, IcuMessageInfo> = {};
    
    for (const [key, message] of Object.entries(resources)) {
      analysis[key] = this.analyzeIcuMessage(message);
    }
    
    return analysis;
  }

  private analyzeIcuMessage(message: string): IcuMessageInfo {
    const info: IcuMessageInfo = {
      hasIcuSyntax: false,
      placeholders: [],
      messageType: 'simple'
    };

    // Check for ICU syntax patterns
    const icuPatterns = [
      /\{[^}]+\}/g, // Basic placeholders
      /\{[^}]+,\s*plural\s*,/g, // Plural forms
      /\{[^}]+,\s*select\s*,/g, // Select forms
    ];

    let hasIcuSyntax = false;
    for (const pattern of icuPatterns) {
      if (pattern.test(message)) {
        hasIcuSyntax = true;
        break;
      }
    }

    info.hasIcuSyntax = hasIcuSyntax;

    if (hasIcuSyntax) {
      // Extract placeholders
      info.placeholders = this.extractIcuPlaceholders(message);
      
      // Determine message type - check for specific patterns
      if (message.includes(', plural,') || message.includes(',plural,')) {
        info.messageType = 'plural';
        info.pluralForms = this.extractPluralForms(message);
      } else if (message.includes(', select,') || message.includes(',select,')) {
        info.messageType = 'select';
        info.selectOptions = this.extractSelectOptions(message);
      } else if (info.placeholders.length > 0) {
        info.messageType = 'complex';
      }
    }

    return info;
  }

  private extractIcuPlaceholders(message: string): string[] {
    const placeholders: string[] = [];
    
    // Use a simple approach to find all {variable} patterns
    const placeholderPattern = /\{([a-zA-Z_][a-zA-Z0-9_]*)/g;
    let match;
    
    while ((match = placeholderPattern.exec(message)) !== null) {
      const variableName = match[1];
      if (!placeholders.includes(variableName)) {
        placeholders.push(variableName);
      }
    }

    return placeholders;
  }

  private extractPluralForms(message: string): string[] {
    const pluralForms: string[] = [];
    
    // Match plural patterns like {count, plural, =0 {no items} =1 {one item} other {# items}}
    const pluralPattern = /\{[^,]+,\s*plural\s*,\s*(.+)\}/g;
    const match = pluralPattern.exec(message);
    
    if (match) {
      const pluralContent = match[1];
      // Extract plural form keys (=0, =1, other, few, many, etc.)
      // Use a more robust approach to handle nested braces
      const formPattern = /(=\d+|zero|one|two|few|many|other)\s*\{/g;
      let formMatch;
      
      while ((formMatch = formPattern.exec(pluralContent)) !== null) {
        const form = formMatch[1];
        if (!pluralForms.includes(form)) {
          pluralForms.push(form);
        }
      }
    }

    return pluralForms;
  }

  private extractSelectOptions(message: string): string[] {
    const selectOptions: string[] = [];
    
    // Match select patterns like {gender, select, male {he} female {she} other {they}}
    const selectPattern = /\{[^,]+,\s*select\s*,\s*(.+)\}/g;
    const match = selectPattern.exec(message);
    
    if (match) {
      const selectContent = match[1];
      // Extract select option keys
      // Use a more robust approach to handle nested braces
      const optionPattern = /(\w+)\s*\{/g;
      let optionMatch;
      
      while ((optionMatch = optionPattern.exec(selectContent)) !== null) {
        const option = optionMatch[1];
        if (!selectOptions.includes(option)) {
          selectOptions.push(option);
        }
      }
    }

    return selectOptions;
  }

  private validateIcuMessageIntegrity(original: string, translated: string): boolean {
    const originalInfo = this.analyzeIcuMessage(original);
    const translatedInfo = this.analyzeIcuMessage(translated);

    // Both should have same ICU syntax presence
    if (originalInfo.hasIcuSyntax !== translatedInfo.hasIcuSyntax) {
      return false;
    }

    // If no ICU syntax, no further validation needed
    if (!originalInfo.hasIcuSyntax) {
      return true;
    }

    // Check message types match
    if (originalInfo.messageType !== translatedInfo.messageType) {
      return false;
    }

    // Check placeholders match
    if (originalInfo.placeholders.length !== translatedInfo.placeholders.length) {
      return false;
    }

    for (const placeholder of originalInfo.placeholders) {
      if (!translatedInfo.placeholders.includes(placeholder)) {
        return false;
      }
    }

    // Check plural forms match (if applicable)
    if (originalInfo.pluralForms && translatedInfo.pluralForms) {
      if (originalInfo.pluralForms.length !== translatedInfo.pluralForms.length) {
        return false;
      }
      
      for (const form of originalInfo.pluralForms) {
        if (!translatedInfo.pluralForms.includes(form)) {
          return false;
        }
      }
    }

    // Check select options match (if applicable)
    if (originalInfo.selectOptions && translatedInfo.selectOptions) {
      if (originalInfo.selectOptions.length !== translatedInfo.selectOptions.length) {
        return false;
      }
      
      for (const option of originalInfo.selectOptions) {
        if (!translatedInfo.selectOptions.includes(option)) {
          return false;
        }
      }
    }

    return true;
  }

  private getIndentation(options?: FormatOptions): string | number {
    if (options?.indentation !== undefined) {
      return options.indentation;
    }
    return 2; // Default indentation
  }
}