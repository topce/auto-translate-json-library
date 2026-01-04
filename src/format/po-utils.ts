/**
 * Utilities for handling PO/POT plural forms and context
 */

export interface PluralRule {
  nplurals: number;
  plural: string;
  description: string;
}

export interface ContextualTranslation {
  context: string;
  msgid: string;
  msgstr: string[];
  msgid_plural?: string;
}

/**
 * Comprehensive plural forms for different languages
 * Based on GNU gettext documentation and Unicode CLDR
 */
export const PLURAL_FORMS: Record<string, PluralRule> = {
  // Germanic languages
  "en": {
    nplurals: 2,
    plural: "(n != 1)",
    description: "English: singular for 1, plural for others"
  },
  "de": {
    nplurals: 2,
    plural: "(n != 1)",
    description: "German: singular for 1, plural for others"
  },
  "nl": {
    nplurals: 2,
    plural: "(n != 1)",
    description: "Dutch: singular for 1, plural for others"
  },
  "da": {
    nplurals: 2,
    plural: "(n != 1)",
    description: "Danish: singular for 1, plural for others"
  },
  "sv": {
    nplurals: 2,
    plural: "(n != 1)",
    description: "Swedish: singular for 1, plural for others"
  },
  "no": {
    nplurals: 2,
    plural: "(n != 1)",
    description: "Norwegian: singular for 1, plural for others"
  },

  // Romance languages
  "es": {
    nplurals: 2,
    plural: "(n != 1)",
    description: "Spanish: singular for 1, plural for others"
  },
  "pt": {
    nplurals: 2,
    plural: "(n != 1)",
    description: "Portuguese: singular for 1, plural for others"
  },
  "it": {
    nplurals: 2,
    plural: "(n != 1)",
    description: "Italian: singular for 1, plural for others"
  },
  "ca": {
    nplurals: 2,
    plural: "(n != 1)",
    description: "Catalan: singular for 1, plural for others"
  },
  "fr": {
    nplurals: 2,
    plural: "(n > 1)",
    description: "French: singular for 0 and 1, plural for others"
  },
  "ro": {
    nplurals: 3,
    plural: "(n==1 ? 0 : (n==0 || (n%100 > 0 && n%100 < 20)) ? 1 : 2)",
    description: "Romanian: complex plural rules"
  },

  // Slavic languages
  "ru": {
    nplurals: 3,
    plural: "(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2)",
    description: "Russian: complex plural rules based on last digits"
  },
  "uk": {
    nplurals: 3,
    plural: "(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2)",
    description: "Ukrainian: same as Russian"
  },
  "pl": {
    nplurals: 3,
    plural: "(n==1 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2)",
    description: "Polish: complex plural rules"
  },
  "cs": {
    nplurals: 3,
    plural: "(n==1) ? 0 : (n>=2 && n<=4) ? 1 : 2",
    description: "Czech: 1, 2-4, 5+"
  },
  "sk": {
    nplurals: 3,
    plural: "(n==1) ? 0 : (n>=2 && n<=4) ? 1 : 2",
    description: "Slovak: same as Czech"
  },
  "hr": {
    nplurals: 3,
    plural: "(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2)",
    description: "Croatian: same as Russian"
  },
  "sr": {
    nplurals: 3,
    plural: "(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2)",
    description: "Serbian: same as Russian"
  },
  "bg": {
    nplurals: 2,
    plural: "(n != 1)",
    description: "Bulgarian: singular for 1, plural for others"
  },
  "sl": {
    nplurals: 4,
    plural: "(n%100==1 ? 0 : n%100==2 ? 1 : n%100==3 || n%100==4 ? 2 : 3)",
    description: "Slovenian: very complex plural rules"
  },

  // Asian languages
  "zh": {
    nplurals: 1,
    plural: "0",
    description: "Chinese: no plural forms"
  },
  "ja": {
    nplurals: 1,
    plural: "0",
    description: "Japanese: no plural forms"
  },
  "ko": {
    nplurals: 1,
    plural: "0",
    description: "Korean: no plural forms"
  },
  "th": {
    nplurals: 1,
    plural: "0",
    description: "Thai: no plural forms"
  },
  "vi": {
    nplurals: 1,
    plural: "0",
    description: "Vietnamese: no plural forms"
  },

  // Other languages
  "ar": {
    nplurals: 6,
    plural: "(n==0 ? 0 : n==1 ? 1 : n==2 ? 2 : n%100>=3 && n%100<=10 ? 3 : n%100>=11 ? 4 : 5)",
    description: "Arabic: very complex plural rules"
  },
  "he": {
    nplurals: 2,
    plural: "(n != 1)",
    description: "Hebrew: singular for 1, plural for others"
  },
  "tr": {
    nplurals: 2,
    plural: "(n > 1)",
    description: "Turkish: singular for 0 and 1, plural for others"
  },
  "fi": {
    nplurals: 2,
    plural: "(n != 1)",
    description: "Finnish: singular for 1, plural for others"
  },
  "hu": {
    nplurals: 2,
    plural: "(n != 1)",
    description: "Hungarian: singular for 1, plural for others"
  },
  "et": {
    nplurals: 2,
    plural: "(n != 1)",
    description: "Estonian: singular for 1, plural for others"
  },
  "lv": {
    nplurals: 3,
    plural: "(n%10==1 && n%100!=11 ? 0 : n != 0 ? 1 : 2)",
    description: "Latvian: complex plural rules"
  },
  "lt": {
    nplurals: 3,
    plural: "(n%10==1 && n%100!=11 ? 0 : n%10>=2 && (n%100<10 || n%100>=20) ? 1 : 2)",
    description: "Lithuanian: complex plural rules"
  },
};

/**
 * Get plural form rule for a language
 */
export function getPluralRule(language: string): PluralRule {
  // Extract language code (e.g., "en-US" -> "en")
  const langCode = language.split("-")[0].toLowerCase();
  
  return PLURAL_FORMS[langCode] || PLURAL_FORMS["en"]; // Default to English
}

/**
 * Format plural forms header for PO files
 */
export function formatPluralFormsHeader(language: string): string {
  const rule = getPluralRule(language);
  return `nplurals=${rule.nplurals}; plural=${rule.plural};`;
}

/**
 * Validate plural form expression
 */
export function validatePluralExpression(expression: string, nplurals: number): boolean {
  try {
    // Basic validation - check if expression contains valid operators and variables
    const validPattern = /^[n\d\s+\-*/%()!=<>&|?:]+$/;
    if (!validPattern.test(expression)) {
      return false;
    }

    // Check if expression uses only 'n' as variable
    const variablePattern = /[a-zA-Z]+/g;
    const variables = expression.match(variablePattern) || [];
    const invalidVars = variables.filter(v => v !== "n");
    if (invalidVars.length > 0) {
      return false;
    }

    // Test expression with sample values
    for (let n = 0; n < 10; n++) {
      const result = evaluatePluralExpression(expression, n);
      if (result < 0 || result >= nplurals) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Evaluate plural expression for a given number
 * WARNING: This uses eval() and should only be used with trusted input
 */
export function evaluatePluralExpression(expression: string, n: number): number {
  try {
    // Replace 'n' with the actual number (ensure it's not part of another word)
    const code = expression.replace(/(^|[^a-zA-Z_])n([^a-zA-Z_]|$)/g, `$1${n.toString()}$2`);
    
    // Basic safety check - only allow mathematical expressions
    if (!/^[\d\s+\*/%()!=<>&|?:-]+$/.test(code)) {
      throw new Error("Invalid expression");
    }
    
    // eslint-disable-next-line no-eval
    const result = eval(code);
    // Convert boolean to number: true -> 1, false -> 0
    if (typeof result === "boolean") {
      return result ? 1 : 0;
    }
    return typeof result === "number" ? Math.floor(result) : 0;
  } catch {
    return 0; // Default to first plural form on error
  }
}

/**
 * Parse context from a translation key
 */
export function parseContext(key: string): { context: string; msgid: string } {
  const contextSeparator = "|";
  const separatorIndex = key.indexOf(contextSeparator);
  
  if (separatorIndex === -1) {
    return { context: "", msgid: key };
  }
  
  return {
    context: key.substring(0, separatorIndex),
    msgid: key.substring(separatorIndex + 1)
  };
}

/**
 * Create context key from context and msgid
 */
export function createContextKey(context: string, msgid: string): string {
  return context ? `${context}|${msgid}` : msgid;
}

/**
 * Parse plural form index from a translation key
 */
export function parsePluralIndex(key: string): { baseKey: string; pluralIndex?: number } {
  const pluralMatch = key.match(/^(.+)\[(\d+)\]$/);
  
  if (!pluralMatch) {
    return { baseKey: key };
  }
  
  return {
    baseKey: pluralMatch[1],
    pluralIndex: parseInt(pluralMatch[2], 10)
  };
}

/**
 * Create plural form key
 */
export function createPluralKey(baseKey: string, index: number): string {
  return `${baseKey}[${index}]`;
}

/**
 * Validate context string
 */
export function validateContext(context: string): boolean {
  // Context should not contain the separator character
  return !context.includes("|");
}

/**
 * Normalize language code for plural form lookup
 */
export function normalizeLanguageCode(language: string): string {
  return language.split("-")[0].toLowerCase();
}

/**
 * Get all supported languages with plural forms
 */
export function getSupportedLanguages(): string[] {
  return Object.keys(PLURAL_FORMS);
}

/**
 * Check if a language has complex plural forms (more than 2 forms)
 */
export function hasComplexPlurals(language: string): boolean {
  const rule = getPluralRule(language);
  return rule.nplurals > 2;
}

/**
 * Generate sample plural forms for a language
 */
export function generateSamplePlurals(language: string, msgid: string, msgidPlural?: string): string[] {
  const rule = getPluralRule(language);
  const samples: string[] = [];
  
  // Generate sample translations for each plural form
  for (let i = 0; i < rule.nplurals; i++) {
    if (i === 0) {
      samples.push(msgid); // Singular form
    } else if (i === 1 && msgidPlural) {
      samples.push(msgidPlural); // First plural form
    } else {
      samples.push(`${msgidPlural || msgid} (form ${i})`); // Additional plural forms
    }
  }
  
  return samples;
}

/**
 * Validate that all required plural forms are present
 */
export function validatePluralForms(
  translations: Record<string, string>, 
  language: string
): { isValid: boolean; missing: string[]; extra: string[] } {
  const rule = getPluralRule(language);
  const missing: string[] = [];
  const extra: string[] = [];
  
  // Group translations by base key
  const pluralGroups = new Map<string, Set<number>>();
  const singularKeys = new Set<string>();
  
  for (const key of Object.keys(translations)) {
    if (key === "_metadata") continue;
    
    const { baseKey, pluralIndex } = parsePluralIndex(key);
    
    if (pluralIndex !== undefined) {
      if (!pluralGroups.has(baseKey)) {
        pluralGroups.set(baseKey, new Set());
      }
      pluralGroups.get(baseKey)!.add(pluralIndex);
      
      // Check for extra plural forms
      if (pluralIndex >= rule.nplurals) {
        extra.push(key);
      }
    } else {
      singularKeys.add(key);
    }
  }
  
  // Check for missing plural forms - only for keys that have plural forms
  for (const [baseKey, indices] of pluralGroups) {
    // Ensure singular form exists (index 0)
    if (!indices.has(0) && !singularKeys.has(baseKey)) {
      missing.push(baseKey); // Singular form
    }
    
    // Check for missing plural indices
    for (let i = 1; i < rule.nplurals; i++) {
      if (!indices.has(i)) {
        missing.push(createPluralKey(baseKey, i));
      }
    }
  }
  
  return {
    isValid: missing.length === 0 && extra.length === 0,
    missing,
    extra
  };
}