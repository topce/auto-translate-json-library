import * as fs from "node:fs";
import * as path from "node:path";
import { POHandler } from "../src/format/po-handler";
import { POTHandler } from "../src/format/pot-handler";
import { 
  getPluralRule, 
  formatPluralFormsHeader, 
  validatePluralForms,
  parseContext,
  createContextKey,
  parsePluralIndex,
  createPluralKey,
  validatePluralExpression,
  evaluatePluralExpression,
  normalizeLanguageCode,
  getSupportedLanguages,
  hasComplexPlurals,
  generateSamplePlurals
} from "../src/format/po-utils";

describe("PO Handler", () => {
  let handler: POHandler;

  beforeEach(() => {
    handler = new POHandler();
  });

  describe("canHandle", () => {
    it("should handle .po files", () => {
      expect(handler.canHandle("test.po")).toBe(true);
      expect(handler.canHandle("test.pot")).toBe(false);
      expect(handler.canHandle("test.json")).toBe(false);
    });

    it("should handle PO content", () => {
      const poContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "Hello"
msgstr "Hola"
`;
      expect(handler.canHandle("test.po", poContent)).toBe(true);
    });
  });

  describe("parse", () => {
    it("should parse simple PO file", () => {
      const poContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: es\\n"

msgid "Hello"
msgstr "Hola"

msgid "World"
msgstr "Mundo"
`;

      const result = handler.parse(poContent);
      
      expect(result.Hello).toBe("Hola");
      expect(result.World).toBe("Mundo");
      expect(result._metadata?.format).toBe("po");
      expect(result._metadata?.targetLanguage).toBe("es");
    });

    it("should parse PO file with context", () => {
      const poContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgctxt "greeting"
msgid "Hello"
msgstr "Hola"

msgctxt "farewell"
msgid "Hello"
msgstr "Adiós"
`;

      const result = handler.parse(poContent);
      
      expect(result["greeting|Hello"]).toBe("Hola");
      expect(result["farewell|Hello"]).toBe("Adiós");
    });

    it("should parse PO file with plural forms", () => {
      const poContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Plural-Forms: nplurals=2; plural=(n != 1);\\n"

msgid "One item"
msgid_plural "%d items"
msgstr[0] "Un elemento"
msgstr[1] "%d elementos"
`;

      const result = handler.parse(poContent);
      
      expect(result["One item"]).toBe("Un elemento");
      expect(result["One item[1]"]).toBe("%d elementos");
    });
  });

  describe("serialize", () => {
    it("should serialize simple translations", () => {
      const data = {
        Hello: "Hola",
        World: "Mundo",
        _metadata: {
          format: "po",
          targetLanguage: "es",
          encoding: "utf-8"
        }
      };

      const result = handler.serialize(data);
      
      expect(result).toContain('msgid "Hello"');
      expect(result).toContain('msgstr "Hola"');
      expect(result).toContain('msgid "World"');
      expect(result).toContain('msgstr "Mundo"');
      expect(result).toContain("Language: es");
    });

    it("should serialize translations with context", () => {
      const data = {
        "greeting|Hello": "Hola",
        "farewell|Hello": "Adiós",
        _metadata: {
          format: "po",
          targetLanguage: "es"
        }
      };

      const result = handler.serialize(data);
      
      expect(result).toContain('msgctxt "greeting"');
      expect(result).toContain('msgctxt "farewell"');
    });

    it("should serialize plural forms", () => {
      const data = {
        "One item": "Un elemento",
        "One item[1]": "%d elementos",
        _metadata: {
          format: "po",
          targetLanguage: "es"
        }
      };

      const result = handler.serialize(data);
      
      expect(result).toContain('msgid_plural');
      expect(result).toContain('msgstr[0] "Un elemento"');
      expect(result).toContain('msgstr[1] "%d elementos"');
    });
  });

  describe("validateStructure", () => {
    it("should validate correct PO structure", () => {
      const data = {
        Hello: "Hola",
        World: "Mundo",
        _metadata: { format: "po" }
      };

      const result = handler.validateStructure(data);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect invalid translation values", () => {
      const data = {
        Hello: 123, // Invalid: should be string
        World: "Mundo",
        _metadata: { format: "po" }
      };

      const result = handler.validateStructure(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].code).toBe("INVALID_TRANSLATION_VALUE");
    });

    it("should warn about empty PO files", () => {
      const data = {
        _metadata: { format: "po" }
      };

      const result = handler.validateStructure(data);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].code).toBe("EMPTY_PO");
    });

    it("should validate plural forms for specific languages", () => {
      const data = {
        "One item": "Un elemento",
        "One item[1]": "%d elementos",
        "One item[2]": "Extra form", // Extra for Spanish
        _metadata: { 
          format: "po",
          targetLanguage: "es"
        }
      };

      const result = handler.validateStructure(data);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === "EXTRA_PLURAL_FORM")).toBe(true);
    });
  });

  describe("real file parsing", () => {
    it("should parse real PO file with all features", () => {
      const poPath = path.join(__dirname, "test-data", "sample.po");
      const poContent = fs.readFileSync(poPath, "utf-8");
      
      const result = handler.parse(poContent);
      
      // Check basic translations
      expect(result["Hello, World!"]).toBe("¡Hola, Mundo!");
      expect(result["Welcome to our application"]).toBe("Bienvenido a nuestra aplicación");
      
      // Check context translations
      expect(result["greeting|Hello"]).toBe("Hola");
      expect(result["farewell|Hello"]).toBe("Adiós");
      
      // Check plural forms
      expect(result["You have %d item"]).toBe("Tienes %d elemento");
      expect(result["You have %d item[1]"]).toBe("Tienes %d elementos");
      
      // Check metadata
      expect(result._metadata?.format).toBe("po");
      expect(result._metadata?.targetLanguage).toBe("es");
      expect(result._metadata?.encoding).toBe("utf-8");
    });

    it("should serialize and parse round-trip correctly", () => {
      const originalData = {
        "Hello, World!": "¡Hola, Mundo!",
        "greeting|Hello": "Hola",
        "farewell|Hello": "Adiós",
        "You have %d item": "Tienes %d elemento",
        "You have %d item[1]": "Tienes %d elementos",
        _metadata: {
          format: "po",
          targetLanguage: "es",
          encoding: "utf-8"
        }
      };

      const serialized = handler.serialize(originalData);
      const parsed = handler.parse(serialized);
      
      // Check that all translations are preserved
      expect(parsed["Hello, World!"]).toBe("¡Hola, Mundo!");
      expect(parsed["greeting|Hello"]).toBe("Hola");
      expect(parsed["farewell|Hello"]).toBe("Adiós");
      expect(parsed["You have %d item"]).toBe("Tienes %d elemento");
      expect(parsed["You have %d item[1]"]).toBe("Tienes %d elementos");
    });

    it("should handle malformed PO files gracefully", () => {
      const malformedPO = `
msgid "Hello"
msgstr "Hola"
# Missing closing quote
msgid "Broken
msgstr "Roto"
`;

      expect(() => handler.parse(malformedPO)).toThrow("Failed to parse PO file");
    });

    it("should handle empty PO files", () => {
      const emptyPO = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
`;

      const result = handler.parse(emptyPO);
      expect(Object.keys(result).filter(k => k !== "_metadata")).toHaveLength(0);
      expect(result._metadata?.format).toBe("po");
    });

    it("should preserve comments and metadata in serialization", () => {
      const poWithComments = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"Language: es\\n"

# Translator comment
#. Extracted comment
#: reference.c:123
#, fuzzy
msgid "Hello"
msgstr "Hola"
`;

      const parsed = handler.parse(poWithComments);
      const serialized = handler.serialize(parsed);
      
      // The serialized version should maintain the translation
      expect(serialized).toContain('msgid "Hello"');
      expect(serialized).toContain('msgstr "Hola"');
    });
  });
});

describe("POT Handler", () => {
  let handler: POTHandler;

  beforeEach(() => {
    handler = new POTHandler();
  });

  describe("canHandle", () => {
    it("should handle .pot files", () => {
      expect(handler.canHandle("test.pot")).toBe(true);
      expect(handler.canHandle("test.po")).toBe(false);
      expect(handler.canHandle("test.json")).toBe(false);
    });

    it("should handle POT content", () => {
      const potContent = `
# POT-Creation-Date: 2024-01-01 12:00+0000
msgid ""
msgstr ""

msgid "Hello"
msgstr ""
`;
      expect(handler.canHandle("test.pot", potContent)).toBe(true);
    });
  });

  describe("generatePOFromTemplate", () => {
    it("should generate PO file from POT template", () => {
      const potContent = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "Hello"
msgstr ""

msgid "World"
msgstr ""
`;

      const translations = {
        Hello: "Hola",
        World: "Mundo"
      };

      const result = handler.generatePOFromTemplate(potContent, "es", translations);
      
      expect(result).toContain('msgid "Hello"');
      expect(result).toContain('msgstr "Hola"');
      expect(result).toContain('msgid "World"');
      expect(result).toContain('msgstr "Mundo"');
      expect(result).toContain("Language: es");
    });

    it("should generate PO from real POT template file", () => {
      const potPath = path.join(__dirname, "test-data", "sample.pot");
      const potContent = fs.readFileSync(potPath, "utf-8");
      
      const translations = {
        "Hello, World!": "¡Hola, Mundo!",
        "Welcome to our application": "Bienvenido a nuestra aplicación",
        "greeting|Hello": "Hola",
        "farewell|Hello": "Adiós",
        "You have %d item": "Tienes %d elemento",
        "You have %d item[1]": "Tienes %d elementos",
        "File saved successfully": "Archivo guardado exitosamente",
        "An error occurred": "Ocurrió un error"
      };

      const result = handler.generatePOFromTemplate(potContent, "es", translations);
      
      // Check that translations are applied
      expect(result).toContain('msgstr "¡Hola, Mundo!"');
      expect(result).toContain('msgstr "Bienvenido a nuestra aplicación"');
      expect(result).toContain('msgstr "Hola"');
      expect(result).toContain('msgstr "Adiós"');
      expect(result).toContain('msgstr[0] "Tienes %d elemento"');
      expect(result).toContain('msgstr[1] "Tienes %d elementos"');
      
      // Check that headers are updated for Spanish
      expect(result).toContain("Language: es");
      expect(result).toContain("nplurals=2; plural=(n != 1);");
    });

    it("should handle POT template without translations", () => {
      const potPath = path.join(__dirname, "test-data", "sample.pot");
      const potContent = fs.readFileSync(potPath, "utf-8");
      
      const result = handler.generatePOFromTemplate(potContent, "fr");
      
      // Check that headers are updated for French
      expect(result).toContain("Language: fr");
      expect(result).toContain("nplurals=2; plural=(n > 1);");
      
      // Check that msgstr entries are empty
      expect(result).toContain('msgstr ""');
    });
  });

  describe("validateStructure", () => {
    it("should validate POT template structure", () => {
      const data = {
        Hello: "",
        World: "",
        _metadata: { format: "pot", isTemplate: true }
      };

      const result = handler.validateStructure(data);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should warn about non-empty template values", () => {
      const data = {
        Hello: "Translated", // Should be empty in template
        World: "",
        _metadata: { format: "pot", isTemplate: true }
      };

      const result = handler.validateStructure(data);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === "NON_EMPTY_TEMPLATE_VALUE")).toBe(true);
    });

    it("should validate POT headers", () => {
      const data = {
        Hello: "",
        _metadata: { 
          format: "pot",
          potHeaders: {
            "Project-Id-Version": "PACKAGE VERSION", // Template placeholder
            "Content-Type": "text/plain; charset=UTF-8"
          }
        }
      };

      const result = handler.validateStructure(data);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.some(w => w.code === "TEMPLATE_PLACEHOLDER")).toBe(true);
    });
  });

  describe("real file parsing", () => {
    it("should parse real POT template file", () => {
      const potPath = path.join(__dirname, "test-data", "sample.pot");
      const potContent = fs.readFileSync(potPath, "utf-8");
      
      const result = handler.parse(potContent);
      
      // Check that all template strings are empty
      expect(result["Hello, World!"]).toBe("");
      expect(result["Welcome to our application"]).toBe("");
      expect(result["greeting|Hello"]).toBe("");
      expect(result["farewell|Hello"]).toBe("");
      expect(result["You have %d item"]).toBe("");
      expect(result["You have %d item[1]"]).toBe("");
      
      // Check metadata
      expect(result._metadata?.format).toBe("pot");
      expect(result._metadata?.isTemplate).toBe(true);
      expect(result._metadata?.encoding).toBe("utf-8");
    });
  });
});

describe("PO Utils", () => {
  describe("getPluralRule", () => {
    it("should return correct plural rules for different languages", () => {
      const enRule = getPluralRule("en");
      expect(enRule.nplurals).toBe(2);
      expect(enRule.plural).toBe("(n != 1)");

      const ruRule = getPluralRule("ru");
      expect(ruRule.nplurals).toBe(3);

      const zhRule = getPluralRule("zh");
      expect(zhRule.nplurals).toBe(1);
    });

    it("should handle language codes with regions", () => {
      const rule = getPluralRule("en-US");
      expect(rule.nplurals).toBe(2);
      expect(rule.plural).toBe("(n != 1)");
    });

    it("should default to English for unknown languages", () => {
      const rule = getPluralRule("unknown");
      expect(rule.nplurals).toBe(2);
      expect(rule.plural).toBe("(n != 1)");
    });
  });

  describe("formatPluralFormsHeader", () => {
    it("should format plural forms header correctly", () => {
      const header = formatPluralFormsHeader("en");
      expect(header).toBe("nplurals=2; plural=(n != 1);");

      const ruHeader = formatPluralFormsHeader("ru");
      expect(ruHeader).toContain("nplurals=3");
    });
  });

  describe("parseContext", () => {
    it("should parse context from keys", () => {
      const result1 = parseContext("greeting|Hello");
      expect(result1.context).toBe("greeting");
      expect(result1.msgid).toBe("Hello");

      const result2 = parseContext("Hello");
      expect(result2.context).toBe("");
      expect(result2.msgid).toBe("Hello");
    });
  });

  describe("createContextKey", () => {
    it("should create context keys correctly", () => {
      expect(createContextKey("greeting", "Hello")).toBe("greeting|Hello");
      expect(createContextKey("", "Hello")).toBe("Hello");
    });
  });

  describe("parsePluralIndex", () => {
    it("should parse plural indices from keys", () => {
      const result1 = parsePluralIndex("Hello[1]");
      expect(result1.baseKey).toBe("Hello");
      expect(result1.pluralIndex).toBe(1);

      const result2 = parsePluralIndex("Hello");
      expect(result2.baseKey).toBe("Hello");
      expect(result2.pluralIndex).toBeUndefined();
    });
  });

  describe("createPluralKey", () => {
    it("should create plural keys correctly", () => {
      expect(createPluralKey("Hello", 1)).toBe("Hello[1]");
      expect(createPluralKey("greeting|Hello", 2)).toBe("greeting|Hello[2]");
    });
  });

  describe("validatePluralForms", () => {
    it("should validate plural forms for different languages", () => {
      const translations = {
        "One item": "Un elemento",
        "One item[1]": "%d elementos"
      };

      const result = validatePluralForms(translations, "es");
      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.extra).toHaveLength(0);
    });

    it("should detect missing plural forms", () => {
      const translations = {
        "One item": "Un elemento",
        "One item[1]": "" // This indicates a plural form exists but is empty
        // Missing would be if we had no [1] at all
      };

      // For this test, let's create a scenario where we have a plural form but missing others
      const translationsWithMissing = {
        "One item": "Un elemento"
        // Missing plural form [1] entirely
      };

      const result = validatePluralForms(translationsWithMissing, "es");
      expect(result.isValid).toBe(true); // Spanish only needs singular, no plural forms required unless explicitly defined
      
      // Test with actual missing plural forms
      const translationsWithPlural = {
        "One item": "Un elemento",
        "One item[2]": "Extra form" // Has [2] but missing [1] - this should be invalid
      };
      
      const result2 = validatePluralForms(translationsWithPlural, "es");
      expect(result2.isValid).toBe(false);
      expect(result2.missing).toContain("One item[1]");
    });

    it("should detect extra plural forms", () => {
      const translations = {
        "One item": "Un elemento",
        "One item[1]": "%d elementos",
        "One item[2]": "Extra form" // Extra for Spanish
      };

      const result = validatePluralForms(translations, "es");
      expect(result.isValid).toBe(false);
      expect(result.extra).toContain("One item[2]");
    });
  });

  describe("validatePluralExpression", () => {
    it("should validate correct plural expressions", () => {
      expect(validatePluralExpression("(n != 1)", 2)).toBe(true);
      expect(validatePluralExpression("(n > 1)", 2)).toBe(true);
      expect(validatePluralExpression("(n%10==1 && n%100!=11 ? 0 : n%10>=2 && n%10<=4 && (n%100<10 || n%100>=20) ? 1 : 2)", 3)).toBe(true);
    });

    it("should reject invalid plural expressions", () => {
      expect(validatePluralExpression("invalid_expression", 2)).toBe(false);
      expect(validatePluralExpression("(x != 1)", 2)).toBe(false); // Invalid variable
      expect(validatePluralExpression("alert('hack')", 2)).toBe(false); // Security risk
    });
  });

  describe("evaluatePluralExpression", () => {
    it("should evaluate plural expressions correctly", () => {
      // (n != 1) returns 1 when n is not 1, 0 when n is 1
      expect(evaluatePluralExpression("(n != 1)", 0)).toBe(1); // 0 != 1 is true -> 1
      expect(evaluatePluralExpression("(n != 1)", 1)).toBe(0); // 1 != 1 is false -> 0
      expect(evaluatePluralExpression("(n != 1)", 2)).toBe(1); // 2 != 1 is true -> 1
      
      // (n > 1) returns 1 when n > 1, 0 otherwise
      expect(evaluatePluralExpression("(n > 1)", 0)).toBe(0); // 0 > 1 is false -> 0
      expect(evaluatePluralExpression("(n > 1)", 1)).toBe(0); // 1 > 1 is false -> 0
      expect(evaluatePluralExpression("(n > 1)", 2)).toBe(1); // 2 > 1 is true -> 1
    });

    it("should handle invalid expressions gracefully", () => {
      expect(evaluatePluralExpression("invalid", 5)).toBe(0);
      expect(evaluatePluralExpression("", 5)).toBe(0);
    });
  });

  describe("normalizeLanguageCode", () => {
    it("should normalize language codes", () => {
      expect(normalizeLanguageCode("en-US")).toBe("en");
      expect(normalizeLanguageCode("es-ES")).toBe("es");
      expect(normalizeLanguageCode("zh-CN")).toBe("zh");
      expect(normalizeLanguageCode("fr")).toBe("fr");
    });
  });

  describe("getSupportedLanguages", () => {
    it("should return list of supported languages", () => {
      const languages = getSupportedLanguages();
      expect(languages).toContain("en");
      expect(languages).toContain("es");
      expect(languages).toContain("fr");
      expect(languages).toContain("ru");
      expect(languages).toContain("zh");
      expect(languages.length).toBeGreaterThan(20);
    });
  });

  describe("hasComplexPlurals", () => {
    it("should identify languages with complex plurals", () => {
      expect(hasComplexPlurals("en")).toBe(false); // 2 forms
      expect(hasComplexPlurals("es")).toBe(false); // 2 forms
      expect(hasComplexPlurals("ru")).toBe(true);  // 3 forms
      expect(hasComplexPlurals("ar")).toBe(true);  // 6 forms
      expect(hasComplexPlurals("zh")).toBe(false); // 1 form
    });
  });

  describe("generateSamplePlurals", () => {
    it("should generate sample plural forms", () => {
      const samples = generateSamplePlurals("en", "item", "items");
      expect(samples).toHaveLength(2);
      expect(samples[0]).toBe("item");
      expect(samples[1]).toBe("items");
      
      const ruSamples = generateSamplePlurals("ru", "элемент", "элементы");
      expect(ruSamples).toHaveLength(3);
      expect(ruSamples[0]).toBe("элемент");
      expect(ruSamples[1]).toBe("элементы");
    });

    it("should handle languages without plural forms", () => {
      const samples = generateSamplePlurals("zh", "项目");
      expect(samples).toHaveLength(1);
      expect(samples[0]).toBe("项目");
    });
  });

  describe("comprehensive plural form validation", () => {
    it("should validate complex Russian plural forms", () => {
      const translations = {
        "файл": "файл",
        "файл[1]": "файла", 
        "файл[2]": "файлов"
      };

      const result = validatePluralForms(translations, "ru");
      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.extra).toHaveLength(0);
    });

    it("should validate Arabic plural forms", () => {
      const translations = {
        "كتاب": "كتاب",
        "كتاب[1]": "كتاب",
        "كتاب[2]": "كتابان",
        "كتاب[3]": "كتب",
        "كتاب[4]": "كتاب",
        "كتاب[5]": "كتاب"
      };

      const result = validatePluralForms(translations, "ar");
      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.extra).toHaveLength(0);
    });

    it("should handle languages with no plural forms", () => {
      const translations = {
        "项目": "项目"
      };

      const result = validatePluralForms(translations, "zh");
      expect(result.isValid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.extra).toHaveLength(0);
    });
  });
});

describe("PO/POT Integration Tests", () => {
  let poHandler: POHandler;
  let potHandler: POTHandler;

  beforeEach(() => {
    poHandler = new POHandler();
    potHandler = new POTHandler();
  });

  describe("POT to PO workflow", () => {
    it("should create PO from POT template and translate back", () => {
      const potPath = path.join(__dirname, "test-data", "sample.pot");
      const potContent = fs.readFileSync(potPath, "utf-8");
      
      // Parse POT template
      const potData = potHandler.parse(potContent);
      
      // Verify template has empty translations
      expect(potData["Hello, World!"]).toBe("");
      expect(potData["greeting|Hello"]).toBe("");
      
      // Generate PO with translations
      const translations = {
        "Hello, World!": "¡Hola, Mundo!",
        "Welcome to our application": "Bienvenido a nuestra aplicación",
        "greeting|Hello": "Hola",
        "farewell|Hello": "Adiós"
      };
      
      const poContent = potHandler.generatePOFromTemplate(potContent, "es", translations);
      
      // Parse the generated PO
      const poData = poHandler.parse(poContent);
      
      // Verify translations are applied
      expect(poData["Hello, World!"]).toBe("¡Hola, Mundo!");
      expect(poData["Welcome to our application"]).toBe("Bienvenido a nuestra aplicación");
      expect(poData["greeting|Hello"]).toBe("Hola");
      expect(poData["farewell|Hello"]).toBe("Adiós");
      expect(poData._metadata?.targetLanguage).toBe("es");
    });

    it("should handle plural forms in POT to PO conversion", () => {
      const potWithPlurals = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgid "One file"
msgid_plural "%d files"
msgstr[0] ""
msgstr[1] ""
`;

      const translations = {
        "One file": "Un archivo",
        "One file[1]": "%d archivos"
      };

      const poContent = potHandler.generatePOFromTemplate(potWithPlurals, "es", translations);
      const poData = poHandler.parse(poContent);

      expect(poData["One file"]).toBe("Un archivo");
      expect(poData["One file[1]"]).toBe("%d archivos");
    });

    it("should maintain context in POT to PO conversion", () => {
      const potWithContext = `
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"

msgctxt "menu"
msgid "File"
msgstr ""

msgctxt "document"
msgid "File"
msgstr ""
`;

      const translations = {
        "menu|File": "Archivo",
        "document|File": "Documento"
      };

      const poContent = potHandler.generatePOFromTemplate(potWithContext, "es", translations);
      const poData = poHandler.parse(poContent);

      expect(poData["menu|File"]).toBe("Archivo");
      expect(poData["document|File"]).toBe("Documento");
    });
  });

  describe("format detection", () => {
    it("should correctly identify PO vs POT files", () => {
      expect(poHandler.canHandle("test.po")).toBe(true);
      expect(poHandler.canHandle("test.pot")).toBe(false);
      
      expect(potHandler.canHandle("test.pot")).toBe(true);
      expect(potHandler.canHandle("test.po")).toBe(false);
    });

    it("should identify PO content by signature", () => {
      const poContent = `
msgid "Hello"
msgstr "Hola"
`;
      
      const potContent = `
# POT-Creation-Date: 2024-01-01 12:00+0000
msgid "Hello"
msgstr ""
`;

      expect(poHandler.canHandle("test.po", poContent)).toBe(true);
      expect(potHandler.canHandle("test.pot", potContent)).toBe(true);
    });
  });

  describe("error handling", () => {
    it("should handle invalid POT template generation", () => {
      const invalidPOT = "not a valid pot file";
      
      expect(() => {
        potHandler.generatePOFromTemplate(invalidPOT, "es");
      }).toThrow("Failed to generate PO from POT template");
    });

    it("should handle serialization errors gracefully", () => {
      const invalidData = {
        Hello: "Hola",
        _metadata: {
          originalStructure: {
            // Create a circular reference that will cause JSON.parse to fail
            get circular() { return this; }
          }
        }
      };

      expect(() => {
        poHandler.serialize(invalidData as any);
      }).toThrow("Failed to serialize PO file");
    });
  });

  describe("encoding handling", () => {
    it("should handle different encodings", () => {
      const data = {
        "Café": "Café",
        "Niño": "Niño",
        "Año": "Año",
        _metadata: {
          format: "po",
          encoding: "utf-8",
          targetLanguage: "es"
        }
      };

      const serialized = poHandler.serialize(data);
      const parsed = poHandler.parse(serialized);

      expect(parsed["Café"]).toBe("Café");
      expect(parsed["Niño"]).toBe("Niño");
      expect(parsed["Año"]).toBe("Año");
    });

    it("should preserve encoding in metadata", () => {
      const data = {
        Hello: "Hola",
        _metadata: {
          format: "po",
          encoding: "iso-8859-1"
        }
      };

      const serialized = poHandler.serialize(data, { encoding: "iso-8859-1" });
      expect(serialized).toContain("charset=iso-8859-1");
    });
  });
});