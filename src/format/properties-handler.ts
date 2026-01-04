import * as path from "node:path";
import * as fs from "node:fs";
import * as propertiesParser from "properties-parser";
import type { 
  IFormatHandler, 
  FormatOptions, 
  ValidationResult, 
  EnhancedTranslationFile 
} from "../format.interface";
import type { TranslationFile } from "../translate.interface";

export class PropertiesHandler implements IFormatHandler {
  canHandle(filePath: string, content?: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    if (extension !== ".properties") {
      return false;
    }

    // If content is provided, check for valid Properties format
    if (content) {
      try {
        propertiesParser.parse(content);
        return true;
      } catch {
        return false;
      }
    }

    return true;
  }

  parse(content: string): EnhancedTranslationFile {
    try {
      // Detect encoding from content before parsing
      const encoding = this.detectEncoding(content);
      
      // Handle Unicode unescaping if needed
      const processedContent = this.unescapeUnicode(content, encoding);
      
      // Parse the properties content
      const parsed = propertiesParser.parse(processedContent);
      
      if (!parsed || typeof parsed !== "object") {
        throw new Error("Properties file is empty or invalid");
      }

      // Extract comments and formatting information from original content
      const comments = this.extractComments(content);
      const formatting = this.extractFormatting(content);
      
      // Extract placeholder information
      const placeholderInfo = this.analyzePlaceholders(parsed);
      
      // Add metadata
      const result: EnhancedTranslationFile = {
        ...parsed,
        _metadata: {
          format: "properties",
          encoding: encoding,
          originalStructure: parsed,
          preserveComments: true,
          preserveAttributes: false,
          comments: comments,
          formatting: formatting,
          hasUnicodeEscapes: this.hasUnicodeEscapes(content),
          placeholders: placeholderInfo,
        }
      };

      return result;
    } catch (error) {
      throw new Error(`Failed to parse Properties: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  serialize(data: EnhancedTranslationFile, options?: FormatOptions): string {
    try {
      // Remove metadata for serialization
      const { _metadata, ...cleanData } = data;
      
      // Apply encoding option with normalization
      const rawEncoding = options?.encoding || _metadata?.encoding || "UTF-8";
      const encoding = this.normalizeEncoding(rawEncoding);
      
      // Build properties content with preserved formatting and comments
      let result = "";
      
      // Add encoding comment if not UTF-8 and preserving formatting
      if (options?.preserveFormatting !== false && encoding !== "UTF-8") {
        result += `# encoding: ${encoding}\n`;
      }
      
      // Add header comment if preserving formatting
      if (options?.preserveFormatting !== false && _metadata?.comments?.header) {
        result += _metadata.comments.header + "\n";
      }
      
      // Process each key-value pair
      for (const [key, value] of Object.entries(cleanData)) {
        // Add any comments for this key
        if (options?.preserveFormatting !== false && _metadata?.comments?.keys?.[key]) {
          result += _metadata.comments.keys[key] + "\n";
        }
        
        // Handle Unicode escaping based on encoding
        const escapedKey = this.escapeKey(key, encoding);
        const escapedValue = this.escapeValue(String(value), encoding);
        
        // Use appropriate separator (= or :) with proper spacing
        const separator = _metadata?.formatting?.separators?.[key] || "=";
        const spacing = separator === "=" ? " = " : ": ";
        
        result += `${escapedKey}${spacing}${escapedValue}\n`;
      }
      
      // Add footer comment if preserving formatting
      if (options?.preserveFormatting !== false && _metadata?.comments?.footer) {
        result += _metadata.comments.footer;
      }
      
      return result;
    } catch (error) {
      throw new Error(`Failed to serialize Properties: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getFileExtension(): string {
    return ".properties";
  }

  validateStructure(data: TranslationFile): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic Properties structure validation
    if (!data || typeof data !== "object") {
      errors.push({
        code: "INVALID_STRUCTURE",
        message: "Properties data must be an object",
      });
      return { isValid: false, errors, warnings };
    }

    if (Array.isArray(data)) {
      errors.push({
        code: "INVALID_ROOT_TYPE",
        message: "Properties root cannot be an array",
      });
      return { isValid: false, errors, warnings };
    }

    // Validate key-value pairs
    for (const [key, value] of Object.entries(data)) {
      // Skip metadata
      if (key === "_metadata") continue;
      
      // Validate key format
      if (!this.isValidPropertyKey(key)) {
        errors.push({
          code: "INVALID_KEY_FORMAT",
          message: `Invalid property key format: ${key}`,
        });
      }
      
      // Check for placeholder variables
      if (typeof value === "string" && this.containsPlaceholders(value)) {
        const placeholders = this.extractPlaceholders(value);
        warnings.push({
          code: "PLACEHOLDER_DETECTED",
          message: `Placeholder variables detected in key ${key}: [${placeholders.join(", ")}]`,
        });
        
        // Validate placeholder syntax
        for (const placeholder of placeholders) {
          if (!this.isValidPlaceholderSyntax(placeholder)) {
            errors.push({
              code: "INVALID_PLACEHOLDER_SYNTAX",
              message: `Invalid placeholder syntax in key ${key}: ${placeholder}`,
            });
          }
        }
      }
      
      // Validate value type
      if (typeof value !== "string" && typeof value !== "number" && typeof value !== "boolean") {
        warnings.push({
          code: "NON_STRING_VALUE",
          message: `Non-string value at key ${key} will be converted to string`,
        });
      }
    }

    // Check for empty properties
    const dataKeys = Object.keys(data).filter(key => key !== "_metadata");
    if (dataKeys.length === 0) {
      warnings.push({
        code: "EMPTY_PROPERTIES",
        message: "Properties file appears to be empty",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private detectEncoding(content: string): string {
    // Check for BOM (Byte Order Mark)
    if (content.startsWith('\uFEFF')) {
      return "UTF-8"; // UTF-8 with BOM
    }
    
    // Check for Unicode escape sequences
    if (/\\u[0-9a-fA-F]{4}/.test(content)) {
      return "ISO-8859-1"; // Properties with Unicode escapes typically use ISO-8859-1
    }
    
    // Check for non-ASCII characters
    if (/[^\x00-\x7F]/.test(content)) {
      return "UTF-8"; // Contains non-ASCII, likely UTF-8
    }
    
    // Check for encoding declaration in comments
    const encodingComment = content.match(/#.*encoding[:\s=]+([^\s\n\r]+)/i);
    if (encodingComment) {
      const declaredEncoding = encodingComment[1].toUpperCase();
      if (declaredEncoding.includes("UTF-8") || declaredEncoding.includes("UTF8")) {
        return "UTF-8";
      }
      if (declaredEncoding.includes("ISO-8859-1") || declaredEncoding.includes("LATIN-1")) {
        return "ISO-8859-1";
      }
    }
    
    return "UTF-8"; // Default to UTF-8
  }

  private hasUnicodeEscapes(content: string): boolean {
    return /\\u[0-9a-fA-F]{4}/.test(content);
  }

  private unescapeUnicode(content: string, encoding: string): string {
    if (encoding === "ISO-8859-1" || this.hasUnicodeEscapes(content)) {
      // Unescape Unicode sequences for proper parsing
      return content.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
        return String.fromCharCode(parseInt(hex, 16));
      });
    }
    return content;
  }

  private normalizeEncoding(encoding: string): string {
    const normalized = encoding.toUpperCase().replace(/[-_]/g, "");
    
    // Map common encoding variations
    const encodingMap: Record<string, string> = {
      "UTF8": "UTF-8",
      "UTF-8": "UTF-8",
      "ISO88591": "ISO-8859-1",
      "ISO-8859-1": "ISO-8859-1",
      "LATIN1": "ISO-8859-1",
      "ASCII": "ASCII",
      "US-ASCII": "ASCII",
    };
    
    return encodingMap[normalized] || "UTF-8";
  }

  private extractComments(content: string): any {
    const comments: any = {
      header: "",
      footer: "",
      keys: {}
    };
    
    const lines = content.split(/\r?\n/);
    let currentKey: string | null = null;
    let headerDone = false;
    let pendingComments: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if line is a comment
      if (line.startsWith("#") || line.startsWith("!")) {
        pendingComments.push(lines[i]); // Preserve original formatting
        continue;
      }
      
      // Check if line is empty
      if (line === "") {
        if (pendingComments.length > 0) {
          pendingComments.push(lines[i]);
        }
        continue;
      }
      
      // Check if line is a property
      if (line.includes("=") || line.includes(":")) {
        headerDone = true;
        
        // Extract key
        const separatorMatch = line.match(/^([^=:]+)[=:]/);
        if (separatorMatch) {
          currentKey = separatorMatch[1].trim();
          
          // Associate pending comments with this key
          if (pendingComments.length > 0) {
            comments.keys[currentKey] = pendingComments.join("\n");
            pendingComments = [];
          }
        }
      }
    }
    
    // Handle remaining comments as footer
    if (pendingComments.length > 0) {
      if (!headerDone) {
        comments.header = pendingComments.join("\n");
      } else {
        comments.footer = pendingComments.join("\n");
      }
    }
    
    return comments;
  }

  private extractFormatting(content: string): any {
    const formatting: any = {
      separators: {}
    };
    
    const lines = content.split(/\r?\n/);
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip comments and empty lines
      if (trimmedLine.startsWith("#") || trimmedLine.startsWith("!") || trimmedLine === "") {
        continue;
      }
      
      // Extract separator type (= or :)
      const equalMatch = trimmedLine.match(/^([^=:]+)(=)/);
      const colonMatch = trimmedLine.match(/^([^=:]+)(:)/);
      
      if (equalMatch) {
        const key = equalMatch[1].trim();
        formatting.separators[key] = "=";
      } else if (colonMatch) {
        const key = colonMatch[1].trim();
        formatting.separators[key] = ":";
      }
    }
    
    return formatting;
  }

  private escapeKey(key: string, encoding: string): string {
    // Keys need to escape spaces, =, :, and other special characters
    let escaped = key.replace(/\\/g, "\\\\"); // Escape backslashes first
    escaped = escaped.replace(/=/g, "\\=");
    escaped = escaped.replace(/:/g, "\\:");
    escaped = escaped.replace(/\s/g, "\\ "); // Escape spaces
    escaped = escaped.replace(/\n/g, "\\n");
    escaped = escaped.replace(/\r/g, "\\r");
    escaped = escaped.replace(/\t/g, "\\t");
    escaped = escaped.replace(/\f/g, "\\f"); // Form feed
    
    // Handle Unicode escaping based on encoding
    escaped = this.applyUnicodeEscaping(escaped, encoding);
    
    return escaped;
  }

  private escapeValue(value: string, encoding: string): string {
    // Values need to escape backslashes and newlines
    let escaped = value.replace(/\\/g, "\\\\"); // Escape backslashes first
    escaped = escaped.replace(/\n/g, "\\n");
    escaped = escaped.replace(/\r/g, "\\r");
    escaped = escaped.replace(/\t/g, "\\t");
    escaped = escaped.replace(/\f/g, "\\f"); // Form feed
    
    // Leading spaces in values need to be escaped
    escaped = escaped.replace(/^(\s+)/, (match) => {
      return match.replace(/\s/g, "\\ ");
    });
    
    // Handle Unicode escaping based on encoding
    escaped = this.applyUnicodeEscaping(escaped, encoding);
    
    return escaped;
  }

  private applyUnicodeEscaping(text: string, encoding: string): string {
    switch (encoding) {
      case "ISO-8859-1":
        // For ISO-8859-1, escape all non-Latin-1 characters
        return text.replace(/[^\x00-\xFF]/g, (char) => {
          const code = char.charCodeAt(0);
          return `\\u${code.toString(16).padStart(4, "0")}`;
        });
      
      case "ASCII":
        // For ASCII, escape all non-ASCII characters
        return text.replace(/[^\x00-\x7F]/g, (char) => {
          const code = char.charCodeAt(0);
          return `\\u${code.toString(16).padStart(4, "0")}`;
        });
      
      case "UTF-8":
      default:
        // For UTF-8, no Unicode escaping needed, but handle surrogate pairs properly
        return text;
    }
  }

  private escapeUnicode(text: string): string {
    return text.replace(/[^\x00-\x7F]/g, (char) => {
      const code = char.charCodeAt(0);
      return `\\u${code.toString(16).padStart(4, "0")}`;
    });
  }

  private isValidPropertyKey(key: string): boolean {
    // Property keys should not be empty and should not start with whitespace
    if (!key || key.trim() !== key || key.trim() === "") {
      return false;
    }
    
    // Keys should not contain unescaped = or : at the beginning
    if (key.match(/^[^\\]*[=:]/)) {
      return false;
    }
    
    return true;
  }

  private containsPlaceholders(value: string): boolean {
    // Common placeholder patterns in Properties files
    const patterns = [
      /\{[^}]+\}/g,           // {placeholder}
      /\$\{[^}]+\}/g,         // ${placeholder}
      /%[^%\s]+%/g,           // %placeholder%
      /%\w+/g,                // %placeholder
      /\{[0-9]+\}/g,          // {0}, {1}, etc. (MessageFormat)
      /\[[^\]]+\]/g,          // [placeholder]
      /@\{[^}]+\}/g,          // @{placeholder}
      /\$[a-zA-Z_][a-zA-Z0-9_]*/g, // $variable
      /#\{[^}]+\}/g,          // #{placeholder}
    ];
    
    return patterns.some(pattern => pattern.test(value));
  }

  private extractPlaceholders(value: string): string[] {
    const placeholders: string[] = [];
    const patterns = [
      /\{[^}]+\}/g,           // {placeholder}
      /\$\{[^}]+\}/g,         // ${placeholder}
      /%[^%\s]+%/g,           // %placeholder%
      /%\w+/g,                // %placeholder
      /\{[0-9]+\}/g,          // {0}, {1}, etc. (MessageFormat)
      /\[[^\]]+\]/g,          // [placeholder]
      /@\{[^}]+\}/g,          // @{placeholder}
      /\$[a-zA-Z_][a-zA-Z0-9_]*/g, // $variable
      /#\{[^}]+\}/g,          // #{placeholder}
    ];
    
    for (const pattern of patterns) {
      const matches = value.match(pattern);
      if (matches) {
        placeholders.push(...matches);
      }
    }
    
    return [...new Set(placeholders)]; // Remove duplicates
  }

  private validatePlaceholderIntegrity(original: string, translated: string): { isValid: boolean; issues: string[] } {
    const originalPlaceholders = this.extractPlaceholders(original);
    const translatedPlaceholders = this.extractPlaceholders(translated);
    const issues: string[] = [];
    
    // Check for missing placeholders
    for (const placeholder of originalPlaceholders) {
      if (!translatedPlaceholders.includes(placeholder)) {
        issues.push(`Missing placeholder: ${placeholder}`);
      }
    }
    
    // Check for extra placeholders
    for (const placeholder of translatedPlaceholders) {
      if (!originalPlaceholders.includes(placeholder)) {
        issues.push(`Extra placeholder: ${placeholder}`);
      }
    }
    
    // Check for placeholder count mismatches (for numbered placeholders)
    const originalNumbered = originalPlaceholders.filter(p => /\{[0-9]+\}/.test(p));
    const translatedNumbered = translatedPlaceholders.filter(p => /\{[0-9]+\}/.test(p));
    
    if (originalNumbered.length !== translatedNumbered.length) {
      issues.push(`Numbered placeholder count mismatch: original has ${originalNumbered.length}, translated has ${translatedNumbered.length}`);
    }
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }

  private analyzePlaceholders(data: Record<string, any>): Record<string, any> {
    const placeholderInfo: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string" && this.containsPlaceholders(value)) {
        const placeholders = this.extractPlaceholders(value);
        placeholderInfo[key] = {
          placeholders: placeholders,
          count: placeholders.length,
          types: this.categorizePlaceholders(placeholders),
        };
      }
    }
    
    return placeholderInfo;
  }

  private categorizePlaceholders(placeholders: string[]): Record<string, number> {
    const types: Record<string, number> = {};
    
    for (const placeholder of placeholders) {
      let type = "unknown";
      
      if (/\{[0-9]+\}/.test(placeholder)) {
        type = "messageformat_numbered";
      } else if (/\{[^}]+\}/.test(placeholder)) {
        type = "curly_braces";
      } else if (/\$\{[^}]+\}/.test(placeholder)) {
        type = "shell_variable";
      } else if (/%[^%\s]+%/.test(placeholder)) {
        type = "percent_wrapped";
      } else if (/%\w+/.test(placeholder)) {
        type = "percent_prefix";
      } else if (/\[[^\]]+\]/.test(placeholder)) {
        type = "square_brackets";
      } else if (/@\{[^}]+\}/.test(placeholder)) {
        type = "at_curly";
      } else if (/\$[a-zA-Z_][a-zA-Z0-9_]*/.test(placeholder)) {
        type = "dollar_variable";
      } else if (/#\{[^}]+\}/.test(placeholder)) {
        type = "hash_curly";
      }
      
      types[type] = (types[type] || 0) + 1;
    }
    
    return types;
  }

  private isValidPlaceholderSyntax(placeholder: string): boolean {
    // Define valid placeholder patterns
    const validPatterns = [
      /^\{[^}]+\}$/,           // {placeholder}
      /^\$\{[^}]+\}$/,         // ${placeholder}
      /^%[^%\s]+%$/,           // %placeholder%
      /^%\w+$/,                // %placeholder
      /^\{[0-9]+\}$/,          // {0}, {1}, etc.
      /^\[[^\]]+\]$/,          // [placeholder]
      /^@\{[^}]+\}$/,          // @{placeholder}
      /^\$[a-zA-Z_][a-zA-Z0-9_]*$/, // $variable
      /^#\{[^}]+\}$/,          // #{placeholder}
    ];
    
    return validPatterns.some(pattern => pattern.test(placeholder));
  }
}