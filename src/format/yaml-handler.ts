import * as path from "node:path";
import * as yaml from "js-yaml";
import type { 
  IFormatHandler, 
  FormatOptions, 
  ValidationResult, 
  EnhancedTranslationFile 
} from "../format.interface";
import type { TranslationFile } from "../translate.interface";

export class YamlHandler implements IFormatHandler {
  canHandle(filePath: string, content?: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    if (extension !== ".yaml" && extension !== ".yml") {
      return false;
    }

    // If content is provided, check for valid YAML
    if (content) {
      try {
        yaml.load(content);
        return true;
      } catch {
        return false;
      }
    }

    return true;
  }

  parse(content: string): EnhancedTranslationFile {
    try {
      const parsed = yaml.load(content, { 
        schema: yaml.DEFAULT_SCHEMA,
        json: false // Allow YAML-specific features
      });
      
      if (parsed === null || parsed === undefined) {
        throw new Error("YAML file is empty or contains only null/undefined");
      }

      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("YAML root must be an object, not an array or primitive value");
      }
      
      // Flatten nested structures for translation while preserving metadata
      const flattened = this.flattenObject(parsed);
      
      // Add metadata
      const result: EnhancedTranslationFile = {
        ...flattened,
        _metadata: {
          format: "yaml",
          originalStructure: parsed,
          preserveComments: true, // YAML supports comments
          preserveAttributes: false,
        }
      };

      return result;
    } catch (error) {
      throw new Error(`Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`);
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
      const yamlOptions: yaml.DumpOptions = {
        indent: this.getIndentation(options),
        lineWidth: -1, // Disable line wrapping
        noRefs: true, // Disable references
        sortKeys: false, // Preserve key order
        schema: yaml.DEFAULT_SCHEMA,
      };

      // Preserve formatting if requested
      if (options?.preserveFormatting !== false) {
        yamlOptions.flowLevel = -1; // Use block style by default
      }
      
      return yaml.dump(result, yamlOptions);
    } catch (error) {
      throw new Error(`Failed to serialize YAML: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getFileExtension(): string {
    return ".yaml";
  }

  validateStructure(data: TranslationFile): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic YAML structure validation
    if (!data || typeof data !== "object") {
      errors.push({
        code: "INVALID_STRUCTURE",
        message: "YAML data must be an object",
      });
      return { isValid: false, errors, warnings };
    }

    if (Array.isArray(data)) {
      errors.push({
        code: "INVALID_ROOT_TYPE",
        message: "YAML root cannot be an array for translation files",
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
          message: "YAML contains circular references",
        });
      }
    }

    // Validate YAML-specific data types and structure integrity
    this.validateYamlDataTypes(data, "", errors, warnings);

    // Validate hierarchical structure integrity
    this.validateHierarchicalStructure(data, "", errors, warnings);

    // Validate that all values are translatable (strings or nested objects with strings)
    this.validateTranslatableContent(data, "", errors, warnings);

    // Check for empty object
    if (Object.keys(data).length === 0) {
      warnings.push({
        code: "EMPTY_YAML",
        message: "YAML file appears to be empty",
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private validateYamlDataTypes(obj: any, path: string, errors: any[], warnings: any[]): void {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // Check for YAML-specific data types
      if (value instanceof Date) {
        warnings.push({
          code: "DATE_VALUE",
          message: `Date value at ${currentPath} will be preserved but not translated`,
        });
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        // Recursively validate nested objects
        this.validateYamlDataTypes(value, currentPath, errors, warnings);
      } else if (Array.isArray(value)) {
        // Validate array contents
        this.validateArrayDataTypes(value, currentPath, errors, warnings);
      }
    }
  }

  private validateArrayDataTypes(arr: any[], path: string, errors: any[], warnings: any[]): void {
    arr.forEach((item, index) => {
      const arrayPath = `${path}[${index}]`;
      
      if (item instanceof Date) {
        warnings.push({
          code: "DATE_VALUE_IN_ARRAY",
          message: `Date value at ${arrayPath} will be preserved but not translated`,
        });
      } else if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        this.validateYamlDataTypes(item, arrayPath, errors, warnings);
      } else if (Array.isArray(item)) {
        this.validateArrayDataTypes(item, arrayPath, errors, warnings);
      }
    });
  }

  private validateHierarchicalStructure(obj: any, path: string, errors: any[], warnings: any[]): void {
    const keys = Object.keys(obj);
    
    // Check for deeply nested structures (more than 10 levels)
    const depth = path.split('.').length;
    if (depth > 10) {
      warnings.push({
        code: "DEEP_NESTING",
        message: `Very deep nesting detected at ${path} (${depth} levels). Consider flattening the structure.`,
      });
    }
    
    // Check for mixed array and object structures at the same level
    let hasArrays = false;
    let hasObjects = false;
    
    for (const [key, value] of Object.entries(obj)) {
      if (Array.isArray(value)) {
        hasArrays = true;
      } else if (typeof value === "object" && value !== null) {
        hasObjects = true;
      }
      
      // Recursively check nested structures
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        this.validateHierarchicalStructure(value, path ? `${path}.${key}` : key, errors, warnings);
      }
    }
    
    if (hasArrays && hasObjects && path) {
      warnings.push({
        code: "MIXED_STRUCTURE",
        message: `Mixed array and object structure at ${path}. This is valid but may complicate translation.`,
      });
    }
  }

  private flattenObject(obj: any, prefix = "", result: Record<string, any> = {}): Record<string, any> {
    for (const [key, value] of Object.entries(obj)) {
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === "string") {
        result[newKey] = value;
      } else if (this.isNonStringPreservableValue(value)) {
        // Preserve non-string values as-is (numbers, booleans, dates, null, etc.)
        result[newKey] = value;
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        // Recursively flatten nested objects
        this.flattenObject(value, newKey, result);
      } else if (Array.isArray(value)) {
        // Handle arrays - support both simple arrays and complex nested arrays
        this.flattenArray(value, newKey, result);
      } else {
        // Other values are preserved as-is
        result[newKey] = value;
      }
    }
    
    return result;
  }

  private flattenArray(arr: any[], prefix: string, result: Record<string, any>): void {
    arr.forEach((item, index) => {
      const arrayKey = `${prefix}[${index}]`;
      
      if (typeof item === "string") {
        result[arrayKey] = item;
      } else if (this.isNonStringPreservableValue(item)) {
        // Preserve non-string values as-is
        result[arrayKey] = item;
      } else if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        // Handle objects within arrays
        this.flattenObject(item, arrayKey, result);
      } else if (Array.isArray(item)) {
        // Handle nested arrays
        this.flattenArray(item, arrayKey, result);
      } else {
        // Other values are preserved as-is
        result[arrayKey] = item;
      }
    });
  }

  private reconstructNestedStructure(original: any, translations: Record<string, any>): any {
    // Deep clone the original structure
    const result = this.deepClone(original);
    
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
      } else if (this.isNonStringPreservableValue(value)) {
        // Check if we have a replacement for non-string values (preserve original if no translation)
        if (translations[currentPath] !== undefined) {
          obj[key] = translations[currentPath];
        }
        // Otherwise, keep the original non-string value
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        // Recursively update nested objects
        this.updateNestedValues(value, translations, currentPath);
      } else if (Array.isArray(value)) {
        // Handle arrays
        this.updateArrayValues(value, translations, currentPath);
      }
    }
  }

  private updateArrayValues(arr: any[], translations: Record<string, any>, path: string): void {
    arr.forEach((item, index) => {
      const arrayPath = `${path}[${index}]`;
      
      if (typeof item === "string" && translations[arrayPath] !== undefined) {
        arr[index] = translations[arrayPath];
      } else if (this.isNonStringPreservableValue(item)) {
        // Check if we have a replacement for non-string values
        if (translations[arrayPath] !== undefined) {
          arr[index] = translations[arrayPath];
        }
        // Otherwise, keep the original non-string value
      } else if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        this.updateNestedValues(item, translations, arrayPath);
      } else if (Array.isArray(item)) {
        this.updateArrayValues(item, translations, arrayPath);
      }
    });
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
          // For non-string preservable values, use appropriate default
          const defaultValue = this.isNonStringPreservableValue(value) ? null : {};
          current[key.name].push(defaultValue);
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
      
      // Ensure array has enough elements
      while (current[lastKey.name].length <= lastKey.index!) {
        current[lastKey.name].push(null);
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
      } else if (this.isNonStringPreservableValue(value)) {
        // Non-string values that should be preserved
        const valueType = this.getValueTypeDescription(value);
        warnings.push({
          code: "NON_TRANSLATABLE_VALUE_PRESERVED",
          message: `${valueType} value at ${currentPath} will be preserved unchanged`,
        });
      } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        // Nested objects - recursively validate
        this.validateTranslatableContent(value, currentPath, errors, warnings, visited);
      } else if (Array.isArray(value)) {
        // Arrays - check each element
        this.validateArrayTranslatableContent(value, currentPath, errors, warnings, visited);
      } else {
        // Other non-string, non-object values
        const valueType = this.getValueTypeDescription(value);
        warnings.push({
          code: "NON_TRANSLATABLE_VALUE",
          message: `${valueType} value at ${currentPath} is not translatable`,
        });
      }
    }
    
    if (typeof obj === "object" && obj !== null) {
      visited.delete(obj);
    }
  }

  private validateArrayTranslatableContent(arr: any[], path: string, errors: any[], warnings: any[], visited: Set<any>): void {
    arr.forEach((item, index) => {
      const arrayPath = `${path}[${index}]`;
      
      if (typeof item === "string") {
        // String in array is translatable
        return;
      } else if (this.isNonStringPreservableValue(item)) {
        // Non-string values that should be preserved
        const valueType = this.getValueTypeDescription(item);
        warnings.push({
          code: "NON_TRANSLATABLE_ARRAY_ITEM_PRESERVED",
          message: `${valueType} value at ${arrayPath} will be preserved unchanged`,
        });
      } else if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        this.validateTranslatableContent(item, arrayPath, errors, warnings, visited);
      } else if (Array.isArray(item)) {
        this.validateArrayTranslatableContent(item, arrayPath, errors, warnings, visited);
      } else {
        // Other non-string, non-object values in arrays
        const valueType = this.getValueTypeDescription(item);
        warnings.push({
          code: "NON_TRANSLATABLE_ARRAY_ITEM",
          message: `${valueType} value at ${arrayPath} is not translatable`,
        });
      }
    });
  }

  private isNonStringPreservableValue(value: any): boolean {
    // Define which non-string values should be preserved
    return (
      typeof value === "number" ||
      typeof value === "boolean" ||
      value === null ||
      value === undefined ||
      value instanceof Date ||
      // YAML-specific types that should be preserved
      (typeof value === "object" && value !== null && value.constructor && 
       ["RegExp", "Buffer"].includes(value.constructor.name))
    );
  }

  private getValueTypeDescription(value: any): string {
    if (value === null) return "null";
    if (value === undefined) return "undefined";
    if (value instanceof Date) return "Date";
    if (typeof value === "number") return "number";
    if (typeof value === "boolean") return "boolean";
    if (Array.isArray(value)) return "array";
    if (typeof value === "object" && value.constructor) {
      return value.constructor.name;
    }
    return typeof value;
  }

  private getIndentation(options?: FormatOptions): number {
    if (options?.indentation !== undefined) {
      if (typeof options.indentation === "number") {
        return options.indentation;
      }
      if (typeof options.indentation === "string") {
        return options.indentation.length;
      }
    }
    return 2; // Default indentation
  }

  private deepClone(obj: any): any {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deepClone(item));
    }
    
    const cloned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      cloned[key] = this.deepClone(value);
    }
    
    return cloned;
  }
}