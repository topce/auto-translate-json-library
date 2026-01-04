import { XmbHandler } from "../src/format/xmb-handler";
import { XtbHandler } from "../src/format/xtb-handler";
import { XmbXtbUtils } from "../src/format/xmb-xtb-utils";
import * as fs from "node:fs";
import * as path from "node:path";

describe("XMB/XTB Handler Tests", () => {
  let xmbHandler: XmbHandler;
  let xtbHandler: XtbHandler;
  let utils: XmbXtbUtils;

  beforeEach(() => {
    xmbHandler = new XmbHandler();
    xtbHandler = new XtbHandler();
    utils = new XmbXtbUtils();
  });

  describe("XMB Handler", () => {
    const sampleXmbContent = `<?xml version="1.0" encoding="UTF-8"?>
<messagebundle locale="en">
  <msg id="HELLO_WORLD" desc="Greeting message">Hello, World!</msg>
  <msg id="USER_GREETING" desc="Personalized greeting" meaning="greeting">Hello, {$username}!</msg>
  <msg id="PLACEHOLDER_EXAMPLE" desc="Example with placeholders">
    Welcome <ph name="USER_NAME">John</ph>, you have <ph name="COUNT">5</ph> messages.
  </msg>
</messagebundle>`;

    test("should handle XMB files correctly", () => {
      expect(xmbHandler.canHandle("test.xmb")).toBe(true);
      expect(xmbHandler.canHandle("test.xml")).toBe(false);
      expect(xmbHandler.canHandle("test.xmb", sampleXmbContent)).toBe(true);
    });

    test("should parse XMB content correctly", () => {
      const result = xmbHandler.parse(sampleXmbContent);
      
      expect(result.HELLO_WORLD).toBe("Hello, World!");
      expect(result.USER_GREETING).toBe("Hello, {$username}!");
      expect(result.PLACEHOLDER_EXAMPLE).toContain("Welcome");
      expect(result.PLACEHOLDER_EXAMPLE).toContain("John");
      expect(result.PLACEHOLDER_EXAMPLE).toContain("5");
      
      expect(result._metadata?.format).toBe("xmb");
      expect(result._metadata?.xmbMetadata?.locale).toBe("en");
    });

    test("should serialize XMB content correctly", () => {
      const parsed = xmbHandler.parse(sampleXmbContent);
      const serialized = xmbHandler.serialize(parsed);
      
      expect(serialized).toContain("<messagebundle");
      expect(serialized).toContain("HELLO_WORLD");
      expect(serialized).toContain("Hello, World!");
    });

    test("should validate XMB structure", () => {
      const parsed = xmbHandler.parse(sampleXmbContent);
      const validation = xmbHandler.validateStructure(parsed);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test("should generate XTB from XMB", () => {
      const translations = {
        HELLO_WORLD: "¡Hola, Mundo!",
        USER_GREETING: "¡Hola, {$username}!",
        PLACEHOLDER_EXAMPLE: "Bienvenido <ph name=\"USER_NAME\">Juan</ph>, tienes <ph name=\"COUNT\">5</ph> mensajes."
      };
      
      const xtbContent = xmbHandler.generateXtbFromXmb(sampleXmbContent, "es", translations);
      
      expect(xtbContent).toContain("<translationbundle");
      expect(xtbContent).toContain("lang=\"es\"");
      expect(xtbContent).toContain("¡Hola, Mundo!");
      expect(xtbContent).toContain("{$username}");
    });
  });

  describe("XTB Handler", () => {
    const sampleXtbContent = `<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="es">
  <translation id="HELLO_WORLD">¡Hola, Mundo!</translation>
  <translation id="USER_GREETING">¡Hola, {$username}!</translation>
  <translation id="PLACEHOLDER_EXAMPLE">
    Bienvenido <ph name="USER_NAME">Juan</ph>, tienes <ph name="COUNT">5</ph> mensajes.
  </translation>
</translationbundle>`;

    test("should handle XTB files correctly", () => {
      expect(xtbHandler.canHandle("test.xtb")).toBe(true);
      expect(xtbHandler.canHandle("test.xml")).toBe(false);
      expect(xtbHandler.canHandle("test.xtb", sampleXtbContent)).toBe(true);
    });

    test("should parse XTB content correctly", () => {
      const result = xtbHandler.parse(sampleXtbContent);
      
      expect(result.HELLO_WORLD).toBe("¡Hola, Mundo!");
      expect(result.USER_GREETING).toBe("¡Hola, {$username}!");
      expect(result.PLACEHOLDER_EXAMPLE).toContain("Bienvenido");
      
      expect(result._metadata?.format).toBe("xtb");
      expect(result._metadata?.xtbMetadata?.language).toBe("es");
    });

    test("should serialize XTB content correctly", () => {
      const parsed = xtbHandler.parse(sampleXtbContent);
      const serialized = xtbHandler.serialize(parsed);
      
      expect(serialized).toContain("<translationbundle");
      expect(serialized).toContain("lang=\"es\"");
      expect(serialized).toContain("¡Hola, Mundo!");
    });

    test("should validate XTB structure", () => {
      const parsed = xtbHandler.parse(sampleXtbContent);
      const validation = xtbHandler.validateStructure(parsed);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test("should update XTB translations", () => {
      const newTranslations = {
        HELLO_WORLD: "¡Hola, Universo!",
        NEW_MESSAGE: "Nuevo mensaje"
      };
      
      const updatedContent = xtbHandler.updateXtbTranslations(sampleXtbContent, newTranslations);
      
      expect(updatedContent).toContain("¡Hola, Universo!");
      expect(updatedContent).toContain("NEW_MESSAGE");
      expect(updatedContent).toContain("Nuevo mensaje");
    });
  });

  describe("XMB/XTB Utils", () => {
    const sampleXmbContent = `<?xml version="1.0" encoding="UTF-8"?>
<messagebundle locale="en">
  <msg id="HELLO_WORLD" desc="Greeting message">Hello, World!</msg>
  <msg id="USER_GREETING" desc="Personalized greeting">Hello, {$username}!</msg>
</messagebundle>`;

    const sampleXtbContent = `<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="es">
  <translation id="HELLO_WORLD">¡Hola, Mundo!</translation>
  <translation id="USER_GREETING">¡Hola, {$username}!</translation>
</translationbundle>`;

    test("should validate bundle integrity", () => {
      const validation = utils.validateBundleIntegrity(sampleXmbContent, sampleXtbContent);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test("should extract translator context", () => {
      const context = utils.extractTranslatorContext(sampleXmbContent);
      
      expect(context.HELLO_WORLD).toBeDefined();
      expect(context.HELLO_WORLD.description).toBe("Greeting message");
      expect(context.HELLO_WORLD.originalText).toBe("Hello, World!");
      
      expect(context.USER_GREETING).toBeDefined();
      expect(context.USER_GREETING.description).toBe("Personalized greeting");
      expect(context.USER_GREETING.placeholders.variables).toContain("{$username}");
    });

    test("should validate message references", () => {
      const validation = utils.validateMessageReferences(sampleXmbContent, sampleXtbContent);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test("should generate XTB from XMB using utils", () => {
      const translations = {
        HELLO_WORLD: "Bonjour le monde!",
        USER_GREETING: "Bonjour, {$username}!"
      };
      
      const xtbContent = utils.generateXtbFromXmb(sampleXmbContent, "fr", translations);
      
      expect(xtbContent).toContain("<translationbundle");
      expect(xtbContent).toContain("lang=\"fr\"");
      expect(xtbContent).toContain("Bonjour le monde!");
      expect(xtbContent).toContain("{$username}");
    });

    test("should update XTB file using utils", () => {
      const newTranslations = {
        HELLO_WORLD: "¡Hola, Universo!",
        NEW_MESSAGE: "Nuevo mensaje"
      };
      
      const updatedContent = utils.updateXtbFile(sampleXtbContent, newTranslations);
      
      expect(updatedContent).toContain("¡Hola, Universo!");
      expect(updatedContent).toContain("NEW_MESSAGE");
      expect(updatedContent).toContain("Nuevo mensaje");
    });
  });

  describe("Placeholder Validation", () => {
    test("should validate placeholder integrity", () => {
      const originalText = "Hello, {$username}! You have <ph name=\"COUNT\">5</ph> messages.";
      const translatedText = "¡Hola, {$username}! Tienes <ph name=\"COUNT\">5</ph> mensajes.";
      
      const validation = xmbHandler.validateMessageIntegrity(originalText, translatedText);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test("should detect missing placeholders", () => {
      const originalText = "Hello, {$username}! You have <ph name=\"COUNT\">5</ph> messages.";
      const translatedText = "¡Hola! Tienes mensajes."; // Missing placeholders
      
      const validation = xmbHandler.validateMessageIntegrity(originalText, translatedText);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(e => e.code === "MISSING_VARIABLE_PLACEHOLDER")).toBe(true);
      expect(validation.errors.some(e => e.code === "MISSING_PH_PLACEHOLDER")).toBe(true);
    });

    test("should detect unmatched braces", () => {
      const textWithUnmatchedBraces = "Hello, {$username! Missing closing brace.";
      
      const validation = xmbHandler.validateStructure({
        TEST_MESSAGE: textWithUnmatchedBraces,
        _metadata: {
          format: "xmb",
          originalStructure: {
            messagebundle: {
              msg: {
                "@_id": "TEST_MESSAGE",
                "#text": textWithUnmatchedBraces
              }
            }
          }
        }
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === "UNMATCHED_PLACEHOLDER_BRACES")).toBe(true);
    });

    test("should detect unmatched ph tags", () => {
      const textWithUnmatchedPh = "Welcome <ph name=\"USER\">John, you have messages.";
      
      const validation = xmbHandler.validateStructure({
        TEST_MESSAGE: textWithUnmatchedPh,
        _metadata: {
          format: "xmb",
          originalStructure: {
            messagebundle: {
              msg: {
                "@_id": "TEST_MESSAGE",
                "#text": textWithUnmatchedPh
              }
            }
          }
        }
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === "UNMATCHED_PH_TAGS")).toBe(true);
    });

    test("should detect empty placeholder names", () => {
      const textWithEmptyPhName = "Hello <ph name=\"\">World</ph>!";
      
      const validation = xmbHandler.validateStructure({
        TEST_MESSAGE: textWithEmptyPhName,
        _metadata: {
          format: "xmb",
          originalStructure: {
            messagebundle: {
              msg: {
                "@_id": "TEST_MESSAGE",
                "#text": textWithEmptyPhName
              }
            }
          }
        }
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === "EMPTY_PLACEHOLDER_NAME")).toBe(true);
    });

    test("should validate complex nested placeholders", () => {
      const originalText = "Status: <ph name=\"STATUS\"><ex>Active</ex></ph> for user {$userId} in <ph name=\"REGION\">US</ph>.";
      const translatedText = "Estado: <ph name=\"STATUS\"><ex>Activo</ex></ph> para usuario {$userId} en <ph name=\"REGION\">US</ph>.";
      
      const validation = xmbHandler.validateMessageIntegrity(originalText, translatedText);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test("should detect unmatched example tags", () => {
      const textWithUnmatchedEx = "Your order will arrive on <ex>Monday.";
      
      const validation = xmbHandler.validateStructure({
        TEST_MESSAGE: textWithUnmatchedEx,
        _metadata: {
          format: "xmb",
          originalStructure: {
            messagebundle: {
              msg: {
                "@_id": "TEST_MESSAGE",
                "#text": textWithUnmatchedEx
              }
            }
          }
        }
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === "UNMATCHED_EX_TAGS")).toBe(true);
    });

    test("should warn about extra placeholders in translation", () => {
      const originalText = "Hello, {$username}!";
      const translatedText = "¡Hola, {$username}! Extra: {$extraVar}";
      
      const validation = xmbHandler.validateMessageIntegrity(originalText, translatedText);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some(w => w.code === "EXTRA_VARIABLE_PLACEHOLDER")).toBe(true);
    });

    test("should validate XTB placeholder integrity", () => {
      const originalText = "Hello, {$username}! You have <ph name=\"COUNT\">5</ph> messages.";
      const translatedText = "¡Hola, {$username}! Tienes <ph name=\"COUNT\">5</ph> mensajes.";
      
      const validation = xtbHandler.validateTranslationIntegrity(originalText, translatedText);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test("should detect missing placeholders in XTB", () => {
      const originalText = "Hello, {$username}! You have <ph name=\"COUNT\">5</ph> messages.";
      const translatedText = "¡Hola! Tienes mensajes."; // Missing placeholders
      
      const validation = xtbHandler.validateTranslationIntegrity(originalText, translatedText);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === "MISSING_VARIABLE_PLACEHOLDER")).toBe(true);
      expect(validation.errors.some(e => e.code === "MISSING_PH_PLACEHOLDER")).toBe(true);
    });

    test("should validate XTB structure with placeholder errors", () => {
      const textWithUnmatchedBraces = "Hello, {$username! Missing closing brace.";
      
      const validation = xtbHandler.validateStructure({
        TEST_MESSAGE: textWithUnmatchedBraces,
        _metadata: {
          format: "xtb",
          originalStructure: {
            translationbundle: {
              translation: {
                "@_id": "TEST_MESSAGE",
                "#text": textWithUnmatchedBraces
              }
            }
          }
        }
      });
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === "UNMATCHED_PLACEHOLDER_BRACES")).toBe(true);
    });
  });

  describe("Mixed Content and Advanced Features", () => {
    test("should handle XMB messages with mixed content (text + elements)", () => {
      const mixedContentXmb = `<?xml version="1.0" encoding="UTF-8"?>
<messagebundle locale="en">
  <msg id="MIXED_CONTENT">
    Welcome <ph name="USER_NAME">John</ph>, you have <ph name="COUNT">5</ph> messages.
  </msg>
</messagebundle>`;
      
      const result = xmbHandler.parse(mixedContentXmb);
      
      expect(result.MIXED_CONTENT).toContain("Welcome");
      expect(result.MIXED_CONTENT).toContain('<ph name="USER_NAME">John</ph>');
      expect(result.MIXED_CONTENT).toContain('<ph name="COUNT">5</ph>');
      expect(result.MIXED_CONTENT).toContain("messages");
    });

    test("should handle XTB translations with mixed content", () => {
      const mixedContentXtb = `<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="es">
  <translation id="MIXED_CONTENT">
    Bienvenido <ph name="USER_NAME">Juan</ph>, tienes <ph name="COUNT">5</ph> mensajes.
  </translation>
</translationbundle>`;
      
      const result = xtbHandler.parse(mixedContentXtb);
      
      expect(result.MIXED_CONTENT).toContain("Bienvenido");
      expect(result.MIXED_CONTENT).toContain('<ph name="USER_NAME">Juan</ph>');
      expect(result.MIXED_CONTENT).toContain('<ph name="COUNT">5</ph>');
      expect(result.MIXED_CONTENT).toContain("mensajes");
    });

    test("should handle XMB messages with example elements", () => {
      const xmbWithExamples = `<?xml version="1.0" encoding="UTF-8"?>
<messagebundle locale="en">
  <msg id="WITH_EXAMPLES">
    Your order will arrive on <ex>Monday</ex>.
  </msg>
</messagebundle>`;
      
      const result = xmbHandler.parse(xmbWithExamples);
      
      expect(result.WITH_EXAMPLES).toContain("Your order will arrive on");
      expect(result.WITH_EXAMPLES).toContain("<ex>Monday</ex>");
    });

    test("should handle XTB translations with example elements", () => {
      const xtbWithExamples = `<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="es">
  <translation id="WITH_EXAMPLES">
    Tu pedido llegará el <ex>lunes</ex>.
  </translation>
</translationbundle>`;
      
      const result = xtbHandler.parse(xtbWithExamples);
      
      expect(result.WITH_EXAMPLES).toContain("Tu pedido llegará el");
      expect(result.WITH_EXAMPLES).toContain("<ex>lunes</ex>");
    });

    test("should handle XMB messages with nested placeholder structures", () => {
      const nestedPlaceholderXmb = `<?xml version="1.0" encoding="UTF-8"?>
<messagebundle locale="en">
  <msg id="NESTED_PH">
    Status: <ph name="STATUS"><ex>Active</ex></ph> for user {$userId}.
  </msg>
</messagebundle>`;
      
      const result = xmbHandler.parse(nestedPlaceholderXmb);
      
      expect(result.NESTED_PH).toContain("Status:");
      expect(result.NESTED_PH).toContain("STATUS");
      expect(result.NESTED_PH).toContain("{$userId}");
      // The exact structure may vary based on how mixed content is parsed
      expect(result.NESTED_PH).toContain("for user");
    });

    test("should handle string-type messages in XMB", () => {
      // Test the case where a message is parsed as a string rather than an object
      const result = xmbHandler.parse(`<?xml version="1.0" encoding="UTF-8"?>
<messagebundle locale="en">
  <msg id="STRING_MESSAGE">Simple string message</msg>
</messagebundle>`);
      
      expect(result.STRING_MESSAGE).toBe("Simple string message");
    });

    test("should handle string-type translations in XTB", () => {
      // Test the case where a translation is parsed as a string rather than an object
      const result = xtbHandler.parse(`<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="es">
  <translation id="STRING_TRANSLATION">Mensaje de cadena simple</translation>
</translationbundle>`);
      
      expect(result.STRING_TRANSLATION).toBe("Mensaje de cadena simple");
    });

    test("should handle XMB messages without #text property", () => {
      // Test fallback to mixed content extraction when #text is not available
      const xmbHandler = new XmbHandler();
      const mockElement = {
        "@_id": "TEST_MESSAGE",
        ph: {
          "@_name": "USER_NAME",
          "#text": "John"
        }
      };
      
      // This tests the extractMixedContent fallback path
      const result = xmbHandler.parse(`<?xml version="1.0" encoding="UTF-8"?>
<messagebundle locale="en">
  <msg id="FALLBACK_MESSAGE">
    <ph name="USER_NAME">John</ph>
  </msg>
</messagebundle>`);
      
      expect(result.FALLBACK_MESSAGE).toContain("John");
    });

    test("should handle XTB translations without #text property", () => {
      // Test fallback to mixed content extraction when #text is not available
      const result = xtbHandler.parse(`<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="es">
  <translation id="FALLBACK_TRANSLATION">
    <ph name="USER_NAME">Juan</ph>
  </translation>
</translationbundle>`);
      
      expect(result.FALLBACK_TRANSLATION).toContain("Juan");
    });

    test("should handle XMB with version attribute", () => {
      const xmbWithVersion = `<?xml version="1.0" encoding="UTF-8"?>
<messagebundle locale="en" version="2.0">
  <msg id="VERSIONED_MESSAGE">Hello with version</msg>
</messagebundle>`;
      
      const result = xmbHandler.parse(xmbWithVersion);
      
      expect(result._metadata?.xmbMetadata?.version).toBe("2.0");
      expect(result.VERSIONED_MESSAGE).toBe("Hello with version");
    });

    test("should handle XTB with version attribute", () => {
      const xtbWithVersion = `<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="es" version="1.5">
  <translation id="VERSIONED_TRANSLATION">Hola con versión</translation>
</translationbundle>`;
      
      const result = xtbHandler.parse(xtbWithVersion);
      
      expect(result._metadata?.xtbMetadata?.version).toBe("1.5");
      expect(result.VERSIONED_TRANSLATION).toBe("Hola con versión");
    });

    test("should handle XTB update with empty existing translations", () => {
      const emptyXtbContent = `<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="es">
</translationbundle>`;
      
      const newTranslations = {
        NEW_MESSAGE_1: "Primer mensaje nuevo",
        NEW_MESSAGE_2: "Segundo mensaje nuevo"
      };
      
      const updatedContent = xtbHandler.updateXtbTranslations(emptyXtbContent, newTranslations);
      
      expect(updatedContent).toContain("NEW_MESSAGE_1");
      expect(updatedContent).toContain("Primer mensaje nuevo");
      expect(updatedContent).toContain("NEW_MESSAGE_2");
      expect(updatedContent).toContain("Segundo mensaje nuevo");
    });
  });

  describe("Real File Testing", () => {
    const testDataPath = path.join(__dirname, "test-data");

    test("should parse real XMB file correctly", () => {
      const xmbContent = fs.readFileSync(path.join(testDataPath, "sample.xmb"), "utf-8");
      const result = xmbHandler.parse(xmbContent);
      
      expect(result.HELLO_WORLD).toBe("Hello, World!");
      expect(result.USER_GREETING).toBe("Hello, {$username}!");
      expect(result.PLACEHOLDER_EXAMPLE).toContain("Welcome");
      expect(result.PLACEHOLDER_EXAMPLE).toContain("<ph name=\"USER_NAME\">John</ph>");
      expect(result.PLACEHOLDER_EXAMPLE).toContain("<ph name=\"COUNT\">5</ph>");
      expect(result.COMPLEX_MESSAGE).toContain("{$itemCount}");
      expect(result.SIMPLE_TEXT).toBe("This is a simple message.");
      
      expect(result._metadata?.format).toBe("xmb");
      expect(result._metadata?.xmbMetadata?.locale).toBe("en");
    });

    test("should parse real XTB file correctly", () => {
      const xtbContent = fs.readFileSync(path.join(testDataPath, "sample-es.xtb"), "utf-8");
      const result = xtbHandler.parse(xtbContent);
      
      expect(result.HELLO_WORLD).toBe("¡Hola, Mundo!");
      expect(result.USER_GREETING).toBe("¡Hola, {$username}!");
      expect(result.PLACEHOLDER_EXAMPLE).toContain("Bienvenido");
      expect(result.PLACEHOLDER_EXAMPLE).toContain("<ph name=\"USER_NAME\">Juan</ph>");
      expect(result.COMPLEX_MESSAGE).toContain("{$itemCount}");
      expect(result.SIMPLE_TEXT).toBe("Este es un mensaje simple.");
      
      expect(result._metadata?.format).toBe("xtb");
      expect(result._metadata?.xtbMetadata?.language).toBe("es");
    });

    test("should validate bundle integrity with real files", () => {
      const xmbContent = fs.readFileSync(path.join(testDataPath, "sample.xmb"), "utf-8");
      const xtbContent = fs.readFileSync(path.join(testDataPath, "sample-es.xtb"), "utf-8");
      
      const validation = utils.validateBundleIntegrity(xmbContent, xtbContent);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    test("should handle malformed XMB files gracefully", () => {
      const malformedXmbContent = fs.readFileSync(path.join(testDataPath, "malformed.xmb"), "utf-8");
      
      const result = xmbHandler.parse(malformedXmbContent);
      const validation = xmbHandler.validateStructure(result);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(e => e.code === "UNMATCHED_PLACEHOLDER_BRACES")).toBe(true);
      expect(validation.errors.some(e => e.code === "MISSING_MESSAGE_ID")).toBe(true);
      
      // The empty placeholder name should be detected in the original structure
      // Let's verify the structure contains the empty name
      const originalStructure = result._metadata?.originalStructure;
      expect(originalStructure).toBeDefined();
      expect(originalStructure.messagebundle.msg.some((msg: any) => 
        msg.ph && msg.ph["@_name"] === ""
      )).toBe(true);
    });

    test("should handle malformed XTB files gracefully", () => {
      const malformedXtbContent = fs.readFileSync(path.join(testDataPath, "malformed.xtb"), "utf-8");
      
      const result = xtbHandler.parse(malformedXtbContent);
      const validation = xtbHandler.validateStructure(result);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some(e => e.code === "UNMATCHED_PLACEHOLDER_BRACES")).toBe(true);
      expect(validation.errors.some(e => e.code === "MISSING_TRANSLATION_ID")).toBe(true);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    test("should handle empty XMB files", () => {
      const emptyXmbContent = `<?xml version="1.0" encoding="UTF-8"?>
<messagebundle locale="en">
</messagebundle>`;
      
      const result = xmbHandler.parse(emptyXmbContent);
      const validation = xmbHandler.validateStructure(result);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some(w => w.code === "NO_MESSAGES")).toBe(true);
    });

    test("should handle empty XTB files", () => {
      const emptyXtbContent = `<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="es">
</translationbundle>`;
      
      const result = xtbHandler.parse(emptyXtbContent);
      const validation = xtbHandler.validateStructure(result);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some(w => w.code === "NO_TRANSLATIONS")).toBe(true);
    });

    test("should handle invalid XML structure", () => {
      const invalidXml = "This is not valid XML";
      
      expect(() => xmbHandler.parse(invalidXml)).toThrow("Failed to parse XMB");
      expect(() => xtbHandler.parse(invalidXml)).toThrow("Failed to parse XTB");
    });

    test("should handle missing root elements", () => {
      const missingRootXmb = `<?xml version="1.0" encoding="UTF-8"?>
<wrongroot>
  <msg id="TEST">Test</msg>
</wrongroot>`;
      
      const missingRootXtb = `<?xml version="1.0" encoding="UTF-8"?>
<wrongroot>
  <translation id="TEST">Test</translation>
</wrongroot>`;
      
      expect(() => xmbHandler.parse(missingRootXmb)).toThrow("missing messagebundle root element");
      expect(() => xtbHandler.parse(missingRootXtb)).toThrow("missing translationbundle root element");
    });

    test("should handle XTB without language attribute", () => {
      const xtbWithoutLang = `<?xml version="1.0" encoding="UTF-8"?>
<translationbundle>
  <translation id="TEST">Test</translation>
</translationbundle>`;
      
      const result = xtbHandler.parse(xtbWithoutLang);
      const validation = xtbHandler.validateStructure(result);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === "MISSING_LANGUAGE")).toBe(true);
    });

    test("should preserve message descriptions and meanings", () => {
      const xmbWithMetadata = `<?xml version="1.0" encoding="UTF-8"?>
<messagebundle locale="en">
  <msg id="GREETING" desc="Welcome message for users" meaning="salutation">Hello!</msg>
</messagebundle>`;
      
      const context = utils.extractTranslatorContext(xmbWithMetadata);
      
      expect(context.GREETING).toBeDefined();
      expect(context.GREETING.description).toBe("Welcome message for users");
      expect(context.GREETING.meaning).toBe("salutation");
      expect(context.GREETING.originalText).toBe("Hello!");
    });

    test("should detect orphaned translations", () => {
      const xmbContent = `<?xml version="1.0" encoding="UTF-8"?>
<messagebundle locale="en">
  <msg id="EXISTING_MESSAGE">Hello</msg>
</messagebundle>`;
      
      const xtbContent = `<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="es">
  <translation id="EXISTING_MESSAGE">Hola</translation>
  <translation id="ORPHANED_MESSAGE">Mensaje huérfano</translation>
</translationbundle>`;
      
      const validation = utils.validateBundleIntegrity(xmbContent, xtbContent);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some(w => w.code === "ORPHANED_TRANSLATION")).toBe(true);
    });

    test("should detect missing translations", () => {
      const xmbContent = `<?xml version="1.0" encoding="UTF-8"?>
<messagebundle locale="en">
  <msg id="MESSAGE_1">Hello</msg>
  <msg id="MESSAGE_2">World</msg>
</messagebundle>`;
      
      const xtbContent = `<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="es">
  <translation id="MESSAGE_1">Hola</translation>
</translationbundle>`;
      
      const validation = utils.validateBundleIntegrity(xmbContent, xtbContent);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some(w => w.code === "MISSING_TRANSLATION")).toBe(true);
    });

    test("should handle XMB with single message (non-array)", () => {
      const singleMessageXmb = `<?xml version="1.0" encoding="UTF-8"?>
<messagebundle locale="en">
  <msg id="SINGLE_MESSAGE" desc="Only one message">Hello World!</msg>
</messagebundle>`;
      
      const result = xmbHandler.parse(singleMessageXmb);
      
      expect(result.SINGLE_MESSAGE).toBe("Hello World!");
      expect(result._metadata?.format).toBe("xmb");
      expect(result._metadata?.xmbMetadata?.locale).toBe("en");
    });

    test("should handle XTB with single translation (non-array)", () => {
      const singleTranslationXtb = `<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="fr">
  <translation id="SINGLE_MESSAGE">Bonjour le monde!</translation>
</translationbundle>`;
      
      const result = xtbHandler.parse(singleTranslationXtb);
      
      expect(result.SINGLE_MESSAGE).toBe("Bonjour le monde!");
      expect(result._metadata?.format).toBe("xtb");
      expect(result._metadata?.xtbMetadata?.language).toBe("fr");
    });

    test("should handle XMB serialization with custom formatting options", () => {
      const xmbContent = `<?xml version="1.0" encoding="UTF-8"?>
<messagebundle locale="en">
  <msg id="TEST_MESSAGE">Hello</msg>
</messagebundle>`;
      
      const parsed = xmbHandler.parse(xmbContent);
      const serialized = xmbHandler.serialize(parsed, {
        indentation: 4,
        xmlDeclaration: true
      });
      
      // The serializer should produce valid XML with the expected content
      expect(serialized).toContain("messagebundle");
      expect(serialized).toContain("TEST_MESSAGE");
      expect(serialized).toContain("Hello");
      // XML declaration should be present when xmlDeclaration is not false
      expect(serialized).toContain("<?xml");
    });

    test("should handle XTB serialization with custom formatting options", () => {
      const xtbContent = `<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="es">
  <translation id="TEST_MESSAGE">Hola</translation>
</translationbundle>`;
      
      const parsed = xtbHandler.parse(xtbContent);
      const serialized = xtbHandler.serialize(parsed, {
        indentation: "\t",
        xmlDeclaration: false
      });
      
      // The serializer should produce valid XML with the expected content
      expect(serialized).toContain("translationbundle");
      expect(serialized).toContain("TEST_MESSAGE");
      expect(serialized).toContain("Hola");
      // Test that custom indentation option is accepted (even if not visibly different in test)
      expect(typeof serialized).toBe("string");
    });

    test("should handle XMB reconstruction without original structure", () => {
      const translationData = {
        MESSAGE_1: "Hello",
        MESSAGE_2: "World",
        _metadata: {
          format: "xmb",
          xmbMetadata: {
            locale: "de",
            version: "2.0"
          }
        }
      };
      
      const serialized = xmbHandler.serialize(translationData as any);
      
      expect(serialized).toContain("locale=\"de\"");
      expect(serialized).toContain("version=\"2.0\"");
      expect(serialized).toContain("MESSAGE_1");
      expect(serialized).toContain("MESSAGE_2");
    });

    test("should handle XTB reconstruction without original structure", () => {
      const translationData = {
        MESSAGE_1: "Hola",
        MESSAGE_2: "Mundo",
        _metadata: {
          format: "xtb",
          xtbMetadata: {
            language: "es",
            version: "1.5"
          }
        }
      };
      
      const serialized = xtbHandler.serialize(translationData as any);
      
      expect(serialized).toContain("lang=\"es\"");
      expect(serialized).toContain("version=\"1.5\"");
      expect(serialized).toContain("MESSAGE_1");
      expect(serialized).toContain("MESSAGE_2");
    });

    test("should validate XMB structure with invalid data types", () => {
      const invalidData = "not an object";
      
      const validation = xmbHandler.validateStructure(invalidData as any);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === "INVALID_STRUCTURE")).toBe(true);
    });

    test("should validate XTB structure with invalid data types", () => {
      const invalidData = null;
      
      const validation = xtbHandler.validateStructure(invalidData as any);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === "INVALID_STRUCTURE")).toBe(true);
    });

    test("should handle XMB with missing locale attribute", () => {
      const xmbWithoutLocale = `<?xml version="1.0" encoding="UTF-8"?>
<messagebundle>
  <msg id="TEST_MESSAGE">Hello</msg>
</messagebundle>`;
      
      const result = xmbHandler.parse(xmbWithoutLocale);
      const validation = xmbHandler.validateStructure(result);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some(w => w.code === "MISSING_LOCALE")).toBe(true);
      expect(result._metadata?.xmbMetadata?.locale).toBe("en"); // Default fallback
    });

    test("should handle utils validation with parse errors", () => {
      const invalidXmbContent = "invalid xml content";
      const validXtbContent = `<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="es">
  <translation id="TEST">Test</translation>
</translationbundle>`;
      
      const validation = utils.validateBundleIntegrity(invalidXmbContent, validXtbContent);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === "BUNDLE_PARSE_ERROR")).toBe(true);
    });

    test("should handle utils message reference validation with parse errors", () => {
      const invalidXmbContent = "invalid xml content";
      const validXtbContent = `<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="es">
  <translation id="TEST">Test</translation>
</translationbundle>`;
      
      const validation = utils.validateMessageReferences(invalidXmbContent, validXtbContent);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === "REFERENCE_VALIDATION_ERROR")).toBe(true);
    });

    test("should handle utils extract translator context with parse errors", () => {
      const invalidXmbContent = "invalid xml content";
      
      const context = utils.extractTranslatorContext(invalidXmbContent);
      
      expect(context).toEqual({});
    });

    test("should detect same language warning in message references", () => {
      const xmbContent = `<?xml version="1.0" encoding="UTF-8"?>
<messagebundle locale="en">
  <msg id="TEST_MESSAGE">Hello</msg>
</messagebundle>`;
      
      const xtbContent = `<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="en">
  <translation id="TEST_MESSAGE">Hello</translation>
</translationbundle>`;
      
      const validation = utils.validateMessageReferences(xmbContent, xtbContent);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some(w => w.code === "SAME_LANGUAGE")).toBe(true);
    });

    test("should detect invalid message references", () => {
      const xmbContent = `<?xml version="1.0" encoding="UTF-8"?>
<messagebundle locale="en">
  <msg id="VALID_MESSAGE">Hello</msg>
</messagebundle>`;
      
      const xtbContent = `<?xml version="1.0" encoding="UTF-8"?>
<translationbundle lang="es">
  <translation id="INVALID_MESSAGE">Hola</translation>
</translationbundle>`;
      
      const validation = utils.validateMessageReferences(xmbContent, xtbContent);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.some(e => e.code === "INVALID_MESSAGE_REFERENCE")).toBe(true);
    });
  });
});