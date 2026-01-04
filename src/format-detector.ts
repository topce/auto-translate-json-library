import * as path from "node:path";
import type { IFormatHandler } from "./format.interface";

export class FormatDetector {
  private static extensionMap: Map<string, string> = new Map([
    [".json", "json"],
    [".xml", "xml"],
    [".xlf", "xliff"],
    [".xliff", "xliff"],
    [".po", "po"],
    [".pot", "pot"],
    [".yaml", "yaml"],
    [".yml", "yaml"],
    [".properties", "properties"],
    [".csv", "csv"],
    [".tsv", "tsv"],
    [".arb", "arb"],
    [".xmb", "xmb"],
    [".xtb", "xtb"],
  ]);

  private static contentSignatures: Map<RegExp, string> = new Map([
    [/^\s*<\?xml[\s\S]*<resources>/, "android-xml"],
    [/^\s*<\?xml[\s\S]*<plist/, "ios-xml"],
    [/^\s*<\?xml[\s\S]*<xliff/, "xliff"],
    [/^\s*<\?xml[\s\S]*<messagebundle/, "xmb"],
    [/^\s*<\?xml[\s\S]*<translationbundle/, "xtb"],
    [/^\s*{[\s\S]*"@@locale"/, "arb"],
    [/^\s*msgid\s+"/m, "po"],
    [/^\s*#.*POT-Creation-Date/m, "pot"],
    [/^\s*[a-zA-Z_][a-zA-Z0-9_]*\s*[:=]/m, "properties"],
  ]);

  static detectFormat(filePath: string, content?: string): string {
    const extension = path.extname(filePath).toLowerCase();
    
    // First try extension-based detection
    const formatFromExtension = this.extensionMap.get(extension);
    if (formatFromExtension && !content) {
      return formatFromExtension;
    }

    // If content is provided, use content signature detection
    if (content) {
      for (const [pattern, format] of this.contentSignatures) {
        if (pattern.test(content)) {
          return format;
        }
      }
    }

    // Fallback to extension-based detection
    return formatFromExtension || "unknown";
  }

  static getSupportedExtensions(): string[] {
    return Array.from(this.extensionMap.keys());
  }

  static getSupportedFormats(): string[] {
    return Array.from(new Set(this.extensionMap.values()));
  }
}