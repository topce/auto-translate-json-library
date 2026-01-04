import * as path from "node:path";
import type { 
  IFormatHandler, 
  FormatOptions, 
  ValidationResult, 
  EnhancedTranslationFile 
} from "../format.interface";
import type { TranslationFile } from "../translate.interface";

export class JsonHandler implements IFormatHandler {
  canHandle(filePath: string, content?: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    if (extension !== ".json") {
      return false;
    }

    // If content is provided, check for valid JSON
    if (content) {
      try {
        JSON.parse(content);
        return true;
      } catch {
        return false;
      }
    }

    return true;
  }

  parse(content: string): EnhancedTranslationFile {
    try {
      const parsed = JSON.parse(content);
      
      // Flatten nested structures for translation while preserving metadata
      const flattened = this.flattenObject(parsed);
      
      // Add metadata
      const result: EnhancedTranslationFile = {
        ...flattened,
        _metadata: {
          format: "json",
          originalStructure: parsed,
          preserveComments: false, // JSON doesn't support comments natively
          preserveAttributes: false,
        }
      };

      return result;
    } catch (error) {
      throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  serialize(data: EnhancedTranslationFile, options?: FormatOptions): string {
    try {
      // Remove metadata for serialization
      const { _metadata, ...cleanData } = data;
      
      let result: any;
      
      if (_metadata?.originalStructure) {
        // Reconstruct original nested structure with translated values
        result = this.reconstructNestedStructure(_metadata.originalStructure, cleanData);
      } else {
        // Use flat structure or attempt to reconstruct from dot notation
        result = this.reconstructFromFlatStructure(cleanData);
      }

      // Apply formatting options
      const indentation = this.getIndentation(options);
      
      return JSON.stringify(result, null, indentation);
    } catch (error) {
      throw new Error(`Failed to serialize JSON: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getFileExtension(): string {
    return ".json";
  }

  validateStructure(data: TranslationFile): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic JSON structure validation
    if (!data || typeof data !== "object") {
      errors.push({
        code: "INVALID_STRUCTURE",
        message: "JSON data must be an object",
      });
      return { isValid: false, errors, warnings };
    }

    // Check for circular references
    try {
      JSON.stringify(data);
    } catch (error) {
      if (error instanceof TypeError && error.message.includes("circular")) {
        errors.push({
          code: "CIRCULAR_REFERENCE",
          message: "JSON contains circular references",
        });
      }
    }

    // Validate that all values are translatable (strings or nested objects with strings)
    this.validateTranslatableContent(data, "", errors, warnings);

    // Check for empty object
    if (Object.keys(data).length === 0) {
      warnings.push({
        code: "EMPTY_JSON",
        message: "JSON file appears to be empty",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private flattenObject(obj: any, prefix = "", result: Record<string, any> = {}): Record<string, any> {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === "string") {
        result[newKey] = value;
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        // Recursively flatten nested objects
        this.flattenObject(value, newKey, result);
      } else if (Array.isArray(value)) {
        // Handle arrays - flatten each element with index
        value.forEach((item, index) => {
          const arrayKey = `${newKey}[${index}]`;
          if (typeof item === "string") {
            result[arrayKey] = item;
          } else if (typeof item === "object" && item !== null) {
            this.flattenObject(item, arrayKey, result);
          } else {
            // Non-string, non-object values in arrays are preserved as-is
            result[arrayKey] = item;
          }
        });
      } else {
        // Non-string, non-object values (numbers, booleans, null) are preserved
        result[newKey] = value;
      }
    }
    
    return result;
  }

  private reconstructNestedStructure(original: any, translations: Record<string, any>): any {
    // Deep clone the original structure
    const result = JSON.parse(JSON.stringify(original));
    
    // Update with translated values
    this.updateNestedValues(result, translations);
    
    return result;
  }

  private updateNestedValues(obj: any, translations: Record<string, any>, path = ""): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === "string") {
        // Check if we have a translation for this path
        if (translations[currentPath] !== undefined) {
          obj[key] = translations[currentPath];
        }
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        // Recursively update nested objects
        this.updateNestedValues(value, translations, currentPath);
      } else if (Array.isArray(value)) {
        // Handle arrays
        value.forEach((item, index) => {
          const arrayPath = `${currentPath}[${index}]`;
          if (typeof item === "string" && translations[arrayPath] !== undefined) {
            value[index] = translations[arrayPath];
          } else if (typeof item === "object" && item !== null) {
            this.updateNestedValues(item, translations, arrayPath);
          }
        });
      }
    }
  }

  private reconstructFromFlatStructure(flatData: Record<string, any>): any {
    const result: any = {};
    
    for (const [key, value] of Object.entries(flatData)) {
      this.setNestedValue(result, key, value);
    }
    
    return result;
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = this.parsePath(path);
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      
      if (key.isArray) {
        if (!Array.isArray(current[key.name])) {
          current[key.name] = [];
        }
        
        // Ensure array has enough elements
        while (current[key.name].length <= key.index!) {
          current[key.name].push({});
        }
        
        current = current[key.name][key.index!];
      } else {
        if (!(key.name in current)) {
          current[key.name] = {};
        }
        current = current[key.name];
      }
    }
    
    const lastKey = keys[keys.length - 1];
    if (lastKey.isArray) {
      if (!Array.isArray(current[lastKey.name])) {
        current[lastKey.name] = [];
      }
      current[lastKey.name][lastKey.index!] = value;
    } else {
      current[lastKey.name] = value;
    }
  }

  private parsePath(path: string): Array<{ name: string; isArray: boolean; index?: number }> {
    const parts = path.split(".");
    const result: Array<{ name: string; isArray: boolean; index?: number }> = [];
    
    for (const part of parts) {
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        result.push({
          name: arrayMatch[1],
          isArray: true,
          index: parseInt(arrayMatch[2], 10),
        });
      } else {
        result.push({
          name: part,
          isArray: false,
        });
      }
    }
    
    return result;
  }

  private validateTranslatableContent(obj: any, path: string, errors: any[], warnings: any[], visited = new Set()): void {
    // Check for circular references
    if (visited.has(obj)) {
      return; // Already processed this object
    }
    
    if (typeof obj === "object" && obj !== null) {
      visited.add(obj);
    }
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === "string") {
        // String values are translatable - this is good
        continue;
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        // Nested objects - recursively validate
        this.validateTranslatableContent(value, currentPath, errors, warnings, visited);
      } else if (Array.isArray(value)) {
        // Arrays - check each element
        value.forEach((item, index) => {
          const arrayPath = `${currentPath}[${index}]`;
          if (typeof item === "string") {
            // String in array is translatable
            return;
          } else if (typeof item === "object" && item !== null) {
            this.validateTranslatableContent(item, arrayPath, errors, warnings, visited);
          } else {
            // Non-string, non-object values in arrays
            warnings.push({
              code: "NON_TRANSLATABLE_ARRAY_ITEM",
              message: `Array item at ${arrayPath} is not translatable (${typeof item})`,
            });
          }
        });
      } else {
        // Non-string, non-object values (numbers, booleans, null)
        warnings.push({
          code: "NON_TRANSLATABLE_VALUE",
          message: `Value at ${currentPath} is not translatable (${typeof value})`,
        });
      }
    }
    
    if (typeof obj === "object" && obj !== null) {
      visited.delete(obj);
    }
  }

  private getIndentation(options?: FormatOptions): string | number {
    if (options?.indentation !== undefined) {
      return options.indentation;
    }
    return 2; // Default indentation
  }
}