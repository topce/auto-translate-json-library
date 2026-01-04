import * as path from "node:path";
import { XMLBuilder, XMLParser } from "fast-xml-parser";
import type { 
  IFormatHandler, 
  FormatOptions, 
  ValidationResult, 
  EnhancedTranslationFile 
} from "../format.interface";
import type { TranslationFile } from "../translate.interface";

interface XliffTransUnit {
  "@_id": string;
  "@_approved"?: string;
  "@_translate"?: string;
  source: string | { "#text": string };
  target?: string | { "#text": string };
  note?: string | string[] | { "#text": string } | { "#text": string }[];
  [key: string]: any;
}

interface XliffUnit {
  "@_id": string;
  "@_approved"?: string;
  "@_translate"?: string;
  segment?: {
    source: string | { "#text": string };
    target?: string | { "#text": string };
  } | {
    source: string | { "#text": string };
    target?: string | { "#text": string };
  }[];
  notes?: {
    note: string | { "#text": string } | (string | { "#text": string })[];
  };
  [key: string]: any;
}

export class XliffHandler implements IFormatHandler {
  private parser: XMLParser;
  private builder: XMLBuilder;

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
    });

    this.builder = new XMLBuilder({
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
    });
  }

  canHandle(filePath: string, content?: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    if (extension !== ".xlf" && extension !== ".xliff") {
      return false;
    }

    // If content is provided, check for XLIFF structure
    if (content) {
      const trimmed = content.trim();
      if (trimmed.includes("<xliff") || trimmed.includes("xliff")) {
        try {
          const parsed = this.parser.parse(content);
          return parsed.xliff !== undefined;
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
      const parsed = this.parser.parse(content);
      
      if (!parsed.xliff) {
        throw new Error("Invalid XLIFF format: missing xliff root element");
      }

      // Detect XLIFF version
      const version = this.detectXliffVersion(parsed.xliff);
      
      // Transform based on version
      const transformed = version.startsWith("2.") 
        ? this.transformXliff2x(parsed.xliff)
        : this.transformXliff12(parsed.xliff);
      
      // Add metadata
      const result: EnhancedTranslationFile = {
        ...transformed,
        _metadata: {
          format: "xliff",
          version: version,
          sourceLanguage: this.extractSourceLanguage(parsed.xliff),
          targetLanguage: this.extractTargetLanguage(parsed.xliff),
          originalStructure: parsed,
          preserveComments: true,
          preserveAttributes: true,
        }
      };

      return result;
    } catch (error) {
      throw new Error(`Failed to parse XLIFF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  serialize(data: EnhancedTranslationFile, options?: FormatOptions): string {
    try {
      let xliffData: any;
      
      if (data._metadata?.originalStructure) {
        // Update the original structure with translated values
        xliffData = this.updateOriginalStructure(data._metadata.originalStructure, data);
      } else {
        // Reconstruct XLIFF structure (default to 1.2 format)
        xliffData = this.reconstructXliff12Structure(data);
      }

      // Apply formatting options
      if (options?.indentation) {
        this.builder = new XMLBuilder({
          ...this.builder,
          indentBy: typeof options.indentation === "string" ? options.indentation : "  ".repeat(options.indentation),
        });
      }

      let result = this.builder.build(xliffData);
      
      // Add XML declaration if needed
      if (options?.xmlDeclaration !== false && !result.startsWith("<?xml")) {
        result = `<?xml version="1.0" encoding="UTF-8"?>\n${result}`;
      }

      return result;
    } catch (error) {
      throw new Error(`Failed to serialize XLIFF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getFileExtension(): string {
    return ".xlf";
  }

  validateStructure(data: TranslationFile): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic XLIFF structure validation
    if (!data || typeof data !== "object") {
      errors.push({
        code: "INVALID_STRUCTURE",
        message: "XLIFF data must be an object",
      });
      return { isValid: false, errors, warnings };
    }

    // Check if this is an EnhancedTranslationFile with metadata
    const enhancedData = data as EnhancedTranslationFile;
    
    if (enhancedData._metadata?.originalStructure) {
      const originalStructure = enhancedData._metadata.originalStructure;
      
      if (!originalStructure.xliff) {
        errors.push({
          code: "MISSING_XLIFF_ROOT",
          message: "XLIFF file must have an 'xliff' root element",
        });
        return { isValid: false, errors, warnings };
      }

      const version = enhancedData._metadata.version || this.detectXliffVersion(originalStructure.xliff);
      
      if (version.startsWith("2.")) {
        this.validateXliff2x(originalStructure.xliff, errors, warnings);
      } else {
        this.validateXliff12(originalStructure.xliff, errors, warnings);
      }
    } else {
      // Validate flattened data - check for required translation keys
      if (Object.keys(data).length === 0) {
        warnings.push({
          code: "EMPTY_XLIFF",
          message: "XLIFF file appears to be empty or contains no translatable content",
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private detectXliffVersion(xliff: any): string {
    const version = xliff["@_version"];
    if (version) {
      return version;
    }
    
    // Try to detect based on structure
    if (xliff.file && xliff.file.unit) {
      return "2.0"; // XLIFF 2.x uses 'unit' elements
    } else if (xliff.file && xliff.file.body && xliff.file.body["trans-unit"]) {
      return "1.2"; // XLIFF 1.2 uses 'trans-unit' elements
    }
    
    return "1.2"; // Default to 1.2
  }

  private extractSourceLanguage(xliff: any): string | undefined {
    return xliff["@_srcLang"] || xliff.file?.["@_source-language"];
  }

  private extractTargetLanguage(xliff: any): string | undefined {
    return xliff["@_trgLang"] || xliff.file?.["@_target-language"];
  }

  private transformXliff12(xliff: any): TranslationFile {
    const result: TranslationFile = {};
    
    if (!xliff.file || !xliff.file.body) {
      return result;
    }

    const body = xliff.file.body;
    const transUnits = body["trans-unit"];
    
    if (!transUnits) {
      return result;
    }

    const units = Array.isArray(transUnits) ? transUnits : [transUnits];
    
    for (const unit of units) {
      const transUnit = unit as XliffTransUnit;
      const id = transUnit["@_id"];
      
      if (!id) {
        continue;
      }

      // Extract source text
      const source = this.extractTextContent(transUnit.source);
      
      // Extract target text if available
      const target = transUnit.target ? this.extractTextContent(transUnit.target) : source;
      
      // Only include if not approved (to allow translation) or if no target exists
      const isApproved = transUnit["@_approved"] === "yes";
      const hasTarget = transUnit.target !== undefined;
      
      if (!isApproved || !hasTarget) {
        result[id] = target || source;
      }
    }

    return result;
  }

  private transformXliff2x(xliff: any): TranslationFile {
    const result: TranslationFile = {};
    
    if (!xliff.file) {
      return result;
    }

    const file = xliff.file;
    const units = file.unit;
    
    if (!units) {
      return result;
    }

    const unitArray = Array.isArray(units) ? units : [units];
    
    for (const unit of unitArray) {
      const xliffUnit = unit as XliffUnit;
      const id = xliffUnit["@_id"];
      
      if (!id) {
        continue;
      }

      // Handle segments
      if (xliffUnit.segment) {
        const segments = Array.isArray(xliffUnit.segment) ? xliffUnit.segment : [xliffUnit.segment];
        
        for (let i = 0; i < segments.length; i++) {
          const segment = segments[i];
          const segmentId = segments.length > 1 ? `${id}.${i}` : id;
          
          // Extract source text
          const source = this.extractTextContent(segment.source);
          
          // Extract target text if available
          const target = segment.target ? this.extractTextContent(segment.target) : source;
          
          // Only include if not approved or if no target exists
          const isApproved = xliffUnit["@_approved"] === "yes";
          const hasTarget = segment.target !== undefined;
          
          if (!isApproved || !hasTarget) {
            result[segmentId] = target || source;
          }
        }
      }
    }

    return result;
  }

  private extractTextContent(element: any): string {
    if (typeof element === "string") {
      return element;
    }
    
    if (typeof element === "object" && element !== null) {
      if (element["#text"] !== undefined) {
        return element["#text"];
      }
      if (element["#cdata"] !== undefined) {
        return element["#cdata"];
      }
    }
    
    return "";
  }

  private updateOriginalStructure(original: any, translated: TranslationFile): any {
    // Deep clone the original structure
    const updated = JSON.parse(JSON.stringify(original));
    
    if (!updated.xliff) {
      return updated;
    }

    const version = this.detectXliffVersion(updated.xliff);
    
    if (version.startsWith("2.")) {
      this.updateXliff2xStructure(updated.xliff, translated);
    } else {
      this.updateXliff12Structure(updated.xliff, translated);
    }
    
    return updated;
  }

  private updateXliff12Structure(xliff: any, translations: TranslationFile): void {
    if (!xliff.file || !xliff.file.body || !xliff.file.body["trans-unit"]) {
      return;
    }

    const transUnits = Array.isArray(xliff.file.body["trans-unit"]) 
      ? xliff.file.body["trans-unit"] 
      : [xliff.file.body["trans-unit"]];

    for (const unit of transUnits) {
      const id = unit["@_id"];
      
      if (id && translations[id] !== undefined) {
        // Don't update if already approved
        if (unit["@_approved"] === "yes") {
          continue;
        }

        // Update or create target element
        if (!unit.target) {
          unit.target = {};
        }
        
        if (typeof unit.target === "object") {
          unit.target["#text"] = translations[id];
        } else {
          unit.target = { "#text": translations[id] };
        }

        // Update translation state
        unit["@_approved"] = "no"; // Mark as not approved since it's a new translation
      }
    }
  }

  private updateXliff2xStructure(xliff: any, translations: TranslationFile): void {
    if (!xliff.file || !xliff.file.unit) {
      return;
    }

    const units = Array.isArray(xliff.file.unit) ? xliff.file.unit : [xliff.file.unit];

    for (const unit of units) {
      const id = unit["@_id"];
      
      if (!id || !unit.segment) {
        continue;
      }

      const segments = Array.isArray(unit.segment) ? unit.segment : [unit.segment];
      
      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        const segmentId = segments.length > 1 ? `${id}.${i}` : id;
        
        if (translations[segmentId] !== undefined) {
          // Don't update if already approved
          if (unit["@_approved"] === "yes") {
            continue;
          }

          // Update or create target element
          if (!segment.target) {
            segment.target = {};
          }
          
          if (typeof segment.target === "object") {
            segment.target["#text"] = translations[segmentId];
          } else {
            segment.target = { "#text": translations[segmentId] };
          }

          // Update translation state
          unit["@_approved"] = "no"; // Mark as not approved since it's a new translation
        }
      }
    }
  }

  private reconstructXliff12Structure(data: EnhancedTranslationFile): any {
    // Remove metadata for reconstruction
    const { _metadata, ...cleanData } = data;
    
    // Create XLIFF 1.2 structure
    const transUnits = Object.entries(cleanData).map(([id, text]) => ({
      "@_id": id,
      "@_approved": "no",
      source: { "#text": String(text) },
      target: { "#text": String(text) },
    }));

    return {
      xliff: {
        "@_version": "1.2",
        "@_xmlns": "urn:oasis:names:tc:xliff:document:1.2",
        file: {
          "@_original": "unknown",
          "@_source-language": _metadata?.sourceLanguage || "en",
          "@_target-language": _metadata?.targetLanguage || "es",
          "@_datatype": "plaintext",
          body: {
            "trans-unit": transUnits,
          },
        },
      },
    };
  }

  private validateXliff12(xliff: any, errors: any[], warnings: any[]): void {
    if (!xliff.file) {
      errors.push({
        code: "MISSING_FILE_ELEMENT",
        message: "XLIFF 1.2 must have a 'file' element",
      });
      return;
    }

    if (!xliff.file.body) {
      errors.push({
        code: "MISSING_BODY_ELEMENT",
        message: "XLIFF 1.2 file must have a 'body' element",
      });
      return;
    }

    if (!xliff.file.body["trans-unit"]) {
      warnings.push({
        code: "NO_TRANS_UNITS",
        message: "No trans-unit elements found in XLIFF 1.2 file",
      });
    }

    // Validate required attributes
    if (!xliff.file["@_source-language"]) {
      warnings.push({
        code: "MISSING_SOURCE_LANGUAGE",
        message: "XLIFF file should specify source-language attribute",
      });
    }
  }

  private validateXliff2x(xliff: any, errors: any[], warnings: any[]): void {
    if (!xliff.file) {
      errors.push({
        code: "MISSING_FILE_ELEMENT",
        message: "XLIFF 2.x must have a 'file' element",
      });
      return;
    }

    if (!xliff.file.unit) {
      warnings.push({
        code: "NO_UNITS",
        message: "No unit elements found in XLIFF 2.x file",
      });
    }

    // Validate required attributes
    if (!xliff["@_srcLang"]) {
      warnings.push({
        code: "MISSING_SOURCE_LANGUAGE",
        message: "XLIFF 2.x file should specify srcLang attribute",
      });
    }
  }
}