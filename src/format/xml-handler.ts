import * as path from "node:path";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import type {
  IFormatHandler,
  FormatOptions,
  ValidationResult,
  EnhancedTranslationFile
} from "../format.interface";
import type { TranslationFile } from "../translate.interface";

export class XmlHandler implements IFormatHandler {
  private parser: XMLParser;
  private builder: XMLBuilder;
  // biome-ignore lint/suspicious/noExplicitAny: Options object structure depends on library version
  private builderOptions: any;

  constructor() {
    this.parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      allowBooleanAttributes: true,
      parseTagValue: false, // Keep as strings to preserve original values
      parseAttributeValue: false, // Keep attributes as strings
      trimValues: true,
      preserveOrder: false,
      commentPropName: "#comment",
      cdataPropName: "#cdata",
      processEntities: true,
      stopNodes: [], // Don't stop parsing on any nodes
      alwaysCreateTextNode: false,
    });

    this.builderOptions = {
      ignoreAttributes: false,
      attributeNamePrefix: "@_",
      textNodeName: "#text",
      format: true,
      indentBy: "  ",
      suppressEmptyNode: false,
      commentPropName: "#comment",
      cdataPropName: "#cdata",
      processEntities: true,
      suppressBooleanAttributes: false,
    };

    this.builder = new XMLBuilder(this.builderOptions);
  }

  canHandle(filePath: string, content?: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    if (extension !== ".xml") {
      return false;
    }

    // If content is provided, check for XML structure
    if (content) {
      const trimmed = content.trim();
      if (trimmed.startsWith("<?xml") || trimmed.startsWith("<")) {
        // Try to parse to validate it's actually XML
        try {
          this.parser.parse(content);
          return true;
        } catch {
          return false;
        }
      }
      return false;
    }

    return true;
  }

  parse(content: string): EnhancedTranslationFile {
    try {
      // Validate that content is actually XML-like
      const trimmed = content.trim();
      if (!trimmed.startsWith('<?xml') && !trimmed.startsWith('<')) {
        throw new Error('Content does not appear to be valid XML');
      }

      // Basic validation for malformed XML
      this.validateXmlStructure(content);

      const parsed = this.parser.parse(content) as TranslationFile;

      // Detect XML format type
      const format = this.detectXmlFormat(content, parsed);

      // Transform based on format
      const transformed = this.transformParsedData(parsed, format);

      // Add metadata
      const result: EnhancedTranslationFile = {
        ...transformed,
        _metadata: {
          format: format,
          originalStructure: parsed,
          preserveComments: true,
          preserveAttributes: true,
        }
      };

      return result;
    } catch (error) {
      throw new Error(`Failed to parse XML: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  serialize(data: EnhancedTranslationFile, options?: FormatOptions): string {
    try {
      // Use original structure if available, otherwise reconstruct
      let xmlData: any;

      if (data._metadata?.originalStructure) {
        // Update the original structure with translated values
        xmlData = this.updateOriginalStructure(data._metadata.originalStructure, data);
      } else {
        // Reconstruct XML structure
        xmlData = this.reconstructXmlStructure(data);
      }

      // Apply formatting options
      let currentBuilder = this.builder;
      if (options?.indentation) {
        currentBuilder = new XMLBuilder({
          ...this.builderOptions,
          indentBy: typeof options.indentation === "string" ? options.indentation : "  ".repeat(options.indentation),
        });
      }

      let result = currentBuilder.build(xmlData);

      // Add XML declaration if needed
      if (options?.xmlDeclaration !== false && !result.startsWith("<?xml")) {
        result = `<?xml version="1.0" encoding="UTF-8"?>\n${result}`;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to serialize XML: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getFileExtension(): string {
    return ".xml";
  }

  validateStructure(data: TranslationFile): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic XML structure validation
    if (!data || typeof data !== "object") {
      errors.push({
        code: "INVALID_STRUCTURE",
        message: "XML data must be an object",
      });
      return { isValid: false, errors, warnings };
    }

    // Check if this is an EnhancedTranslationFile with metadata
    const enhancedData = data as any;

    if (enhancedData._metadata?.originalStructure) {
      // Validate the original structure
      const originalStructure = enhancedData._metadata.originalStructure;

      if (originalStructure.resources !== undefined) {
        // Android strings.xml format
        this.validateAndroidFormat(originalStructure, errors, warnings);
      } else if (originalStructure.plist !== undefined) {
        // iOS plist format
        this.validateIosFormat(originalStructure, errors, warnings);
      } else {
        // Generic XML format
        this.validateGenericXmlFormat(originalStructure, errors, warnings);
      }
    } else {
      // Validate the data directly (for test cases that pass raw structures)
      if (data.resources !== undefined) {
        // Android strings.xml format
        this.validateAndroidFormat(data, errors, warnings);
      } else if (data.plist !== undefined) {
        // iOS plist format
        this.validateIosFormat(data, errors, warnings);
      } else {
        // Check if this looks like Android XML without proper structure
        if (this.looksLikeAndroidXml(data)) {
          this.validateAndroidFormat(data, errors, warnings);
        }
        // Check if this looks like iOS XML without proper structure
        else if (this.looksLikeIosXml(data)) {
          this.validateIosFormat(data, errors, warnings);
        }
        else {
          // Check if it's empty data (should be valid but with warnings)
          const keys = Object.keys(data);
          if (keys.length === 0) {
            warnings.push({
              code: "EMPTY_XML",
              message: "XML file appears to be empty or contains no translatable content",
            });
          } else {
            // Generic XML format or flattened data
            this.validateGenericXmlFormat(data, errors, warnings);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private detectXmlFormat(content: string, parsed: any): string {
    // Check content for XML format indicators
    if (content.includes("<resources") || parsed.resources !== undefined) {
      return "android-xml";
    }
    if (content.includes("<plist") || parsed.plist !== undefined) {
      return "ios-xml";
    }
    return "generic-xml";
  }

  private transformParsedData(parsed: any, format: string): TranslationFile {
    switch (format) {
      case "android-xml":
        return this.transformAndroidXml(parsed);
      case "ios-xml":
        return this.transformIosXml(parsed);
      default:
        return this.transformGenericXml(parsed);
    }
  }

  private transformAndroidXml(parsed: any): TranslationFile {
    const result: TranslationFile = {};

    if (!parsed.resources) {
      return result;
    }

    const resources = parsed.resources;

    // If resources is empty or just an empty object, return empty result
    if (typeof resources === "object" && Object.keys(resources).length === 0) {
      return result;
    }

    // Handle string elements
    if (resources.string) {
      const strings = Array.isArray(resources.string) ? resources.string : [resources.string];
      for (const str of strings) {
        if (str["@_name"]) {
          const key = str["@_name"];
          // Handle different value formats: #text, #cdata, or direct string
          let value = str["#text"] || str["#cdata"];

          // If no #text or #cdata, check if the string element itself is the value
          if (value === undefined) {
            // Check if str is a simple object with just attributes
            const nonAttributeKeys = Object.keys(str).filter(k => !k.startsWith("@_"));
            if (nonAttributeKeys.length === 0) {
              // Empty element
              value = "";
            } else if (nonAttributeKeys.length === 1 && nonAttributeKeys[0] === "#text") {
              value = str["#text"];
            } else {
              // Complex content, try to get text content
              value = str["#text"] || "";
            }
          }

          // Ensure we have a string value
          if (value === undefined || value === null) {
            value = "";
          }

          if (typeof value === "string") {
            result[key] = value;
          }
        }
      }
    }

    // Handle group elements (nested structure)
    if (resources.group) {
      const groups = Array.isArray(resources.group) ? resources.group : [resources.group];
      for (const group of groups) {
        if (group["@_name"] && group.string) {
          const groupName = group["@_name"];
          result[groupName] = {};

          const groupStrings = Array.isArray(group.string) ? group.string : [group.string];
          for (const str of groupStrings) {
            if (str["@_name"]) {
              const key = str["@_name"];
              let value = str["#text"] || str["#cdata"];

              if (value === undefined) {
                const nonAttributeKeys = Object.keys(str).filter(k => !k.startsWith("@_"));
                if (nonAttributeKeys.length === 0) {
                  value = "";
                } else {
                  value = str["#text"] || "";
                }
              }

              if (value === undefined || value === null) {
                value = "";
              }

              if (typeof value === "string") {
                result[groupName][key] = value;
              }
            }
          }
        }
      }
    }

    return result;
  }

  private transformIosXml(parsed: any): TranslationFile {
    const result: TranslationFile = {};

    if (!parsed.plist || !parsed.plist.dict) {
      return result;
    }

    // iOS plist format has key-value pairs in dict
    const dict = parsed.plist.dict;
    if (dict.key && dict.string) {
      const keys = Array.isArray(dict.key) ? dict.key : [dict.key];
      const values = Array.isArray(dict.string) ? dict.string : [dict.string];

      for (let i = 0; i < keys.length && i < values.length; i++) {
        const key = keys[i]["#text"] || keys[i];
        const value = values[i]["#text"] || values[i];
        if (typeof key === "string" && typeof value === "string") {
          result[key] = value;
        }
      }
    }

    return result;
  }

  private transformGenericXml(parsed: any): TranslationFile {
    // For generic XML, flatten the structure while preserving hierarchy
    // Skip the XML declaration and start from the root element
    const rootKeys = Object.keys(parsed).filter(key => !key.startsWith('?xml') && !key.startsWith('@_'));

    if (rootKeys.length === 1) {
      // If there's only one root element, flatten from that element
      const rootElement = parsed[rootKeys[0]];
      return this.flattenXmlStructure(rootElement);
    } else {
      // Multiple root elements, flatten the whole structure
      return this.flattenXmlStructure(parsed);
    }
  }

  private flattenXmlStructure(obj: any, prefix = ""): TranslationFile {
    const result: TranslationFile = {};

    if (!obj || typeof obj !== "object") {
      return result;
    }

    for (const [key, value] of Object.entries(obj)) {
      if (key.startsWith("@_") || key.startsWith("#")) {
        // Skip attributes and special properties for now
        continue;
      }

      const newKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === "string") {
        result[newKey] = value;
      } else if (typeof value === "object" && value !== null) {
        const objValue = value as any;
        if (objValue["#text"] !== undefined) {
          result[newKey] = objValue["#text"];
        } else if (objValue["#cdata"] !== undefined) {
          result[newKey] = objValue["#cdata"];
        } else if (Array.isArray(objValue)) {
          // Handle arrays - for now, just skip them in generic XML
          continue;
        } else {
          // Recursively flatten nested objects
          Object.assign(result, this.flattenXmlStructure(value, newKey));
        }
      }
    }

    return result;
  }

  private updateOriginalStructure(original: any, translated: TranslationFile): any {
    // Deep clone the original structure
    const updated = JSON.parse(JSON.stringify(original));

    // Update translated values while preserving structure
    this.updateTranslatedValues(updated, translated);

    return updated;
  }

  private updateTranslatedValues(structure: any, translations: TranslationFile, path = ""): void {
    if (Array.isArray(structure)) {
      // Handle arrays (like string elements in Android XML)
      for (const item of structure) {
        if (item["@_name"] && typeof item["@_name"] === "string") {
          const key = item["@_name"];
          if (translations[key] !== undefined) {
            // Update the text content
            if (item["#text"] !== undefined) {
              item["#text"] = translations[key];
            } else if (item["#cdata"] !== undefined) {
              item["#cdata"] = translations[key];
            } else {
              // If it's a direct string value
              if (typeof item === "string") {
                // This case is handled by the parent
              } else {
                item["#text"] = translations[key];
              }
            }
          }
        }
        // Recursively update nested structures
        this.updateTranslatedValues(item, translations, path);
      }
    } else if (typeof structure === "object" && structure !== null) {
      // Special handling for iOS plist format
      if (structure.key && structure.string && Array.isArray(structure.key) && Array.isArray(structure.string)) {
        // Update iOS plist key-value pairs
        for (let i = 0; i < structure.key.length && i < structure.string.length; i++) {
          const keyObj = structure.key[i];
          const stringObj = structure.string[i];
          const keyName = keyObj["#text"] || keyObj;

          if (typeof keyName === "string" && translations[keyName] !== undefined) {
            if (stringObj["#text"] !== undefined) {
              stringObj["#text"] = translations[keyName];
            } else if (typeof stringObj === "string") {
              structure.string[i] = translations[keyName];
            } else {
              stringObj["#text"] = translations[keyName];
            }
          }
        }
      }

      for (const [key, value] of Object.entries(structure)) {
        if (key.startsWith("@_") || key.startsWith("#")) {
          continue;
        }

        const currentPath = path ? `${path}.${key}` : key;

        if (typeof value === "object" && value !== null) {
          this.updateTranslatedValues(value, translations, currentPath);
        } else if (typeof value === "string" && translations[currentPath]) {
          structure[key] = translations[currentPath];
        }
      }
    }
  }

  private reconstructXmlStructure(data: EnhancedTranslationFile): any {
    // Remove metadata for reconstruction
    const { _metadata, ...cleanData } = data;

    // We need to separate strings and groups
    const strings: any[] = [];
    const groups: any[] = [];

    for (const [key, value] of Object.entries(cleanData)) {
      if (typeof value === 'object' && value !== null) {
        // handle group
        const groupStrings = Object.entries(value).map(([gKey, gValue]) => ({
          "@_name": gKey,
          "#text": String(gValue)
        }));
        groups.push({
          "@_name": key,
          "string": groupStrings
        });
      } else {
        // handle string
        strings.push({
          "@_name": key,
          "#text": String(value)
        });
      }
    }

    const resources: any = {};
    if (strings.length > 0) resources.string = strings;
    if (groups.length > 0) resources.group = groups;

    return { resources };
  }

  private validateAndroidFormat(data: any, errors: any[], warnings: any[]): void {
    if (!data || typeof data !== "object" || data.resources === undefined) {
      errors.push({
        code: "MISSING_RESOURCES",
        message: "Android XML must have a 'resources' root element",
      });
      return;
    }

    const resources = data.resources;

    // Check for string elements - resources can be empty string or empty object
    if (typeof resources === "string" || (typeof resources === "object" && (!resources.string && !resources.group))) {
      warnings.push({
        code: "NO_STRINGS",
        message: "No string elements found in resources",
      });
    }
  }

  private validateIosFormat(data: any, errors: any[], warnings: any[]): void {
    if (!data || typeof data !== "object" || data.plist === undefined) {
      errors.push({
        code: "MISSING_PLIST",
        message: "iOS XML must have a 'plist' root element",
      });
      return;
    }

    if (typeof data.plist === "object" && data.plist !== null && !data.plist.dict) {
      errors.push({
        code: "MISSING_DICT",
        message: "iOS plist must contain a 'dict' element",
      });
    }
  }

  private validateGenericXmlFormat(data: any, errors: any[], warnings: any[]): void {
    // Generic validation - just ensure it's a valid object
    if (Object.keys(data).length === 0) {
      warnings.push({
        code: "EMPTY_XML",
        message: "XML file appears to be empty or contains no translatable content",
      });
    }
  }

  private validateXmlStructure(content: string): void {
    // Basic XML structure validation
    const trimmed = content.trim();

    // Check for basic XML structure issues
    if (trimmed.includes('<') && !trimmed.includes('>')) {
      throw new Error('Malformed XML: unclosed tag detected');
    }

    // Count opening and closing tags (basic check)
    const openTags = (trimmed.match(/<[^/!?][^>]*>/g) || []).length;
    const closeTags = (trimmed.match(/<\/[^>]+>/g) || []).length;
    const selfClosingTags = (trimmed.match(/<[^>]*\/>/g) || []).length;

    // For proper XML, opening tags should equal closing tags + self-closing tags
    // Allow for XML declaration and DOCTYPE
    const xmlDeclaration = trimmed.match(/<\?xml[^>]*\?>/g) || [];
    const doctype = trimmed.match(/<!DOCTYPE[^>]*>/g) || [];
    const comments = trimmed.match(/<!--[^>]*-->/g) || [];

    const expectedClosingTags = openTags - selfClosingTags - xmlDeclaration.length - doctype.length - comments.length;

    if (expectedClosingTags > closeTags) {
      throw new Error('Malformed XML: unclosed tags detected');
    }
  }

  private looksLikeAndroidXml(data: any): boolean {
    // Check if it has Android XML characteristics without proper structure
    return (
      data.string !== undefined &&
      Array.isArray(data.string) &&
      data.string.some((item: any) => item && typeof item === 'object' && item['@_name'])
    ) || (
        data.group !== undefined &&
        Array.isArray(data.group) &&
        data.group.some((item: any) => item && typeof item === 'object' && item['@_name'])
      );
  }

  private looksLikeIosXml(data: any): boolean {
    // Check if it has iOS XML characteristics without proper structure
    return (
      data.dict !== undefined &&
      typeof data.dict === 'object' &&
      data.dict !== null &&
      (data.dict.key !== undefined || data.dict.string !== undefined)
    );
  }
}