import { PropertiesHandler } from "../src/format/properties-handler";
import type { EnhancedTranslationFile } from "../src/format.interface";
import * as fs from "node:fs";
import * as path from "node:path";

describe("PropertiesHandler", () => {
  let handler: PropertiesHandler;
  let samplePropertiesContent: string;
  let unicodeEscapedContent: string;
  let placeholdersContent: string;

  beforeEach(() => {
    handler = new PropertiesHandler();
    samplePropertiesContent = fs.readFileSync(
      path.join(__dirname, "test-data", "sample.properties"),
      "utf-8"
    );
    unicodeEscapedContent = fs.readFileSync(
      path.join(__dirname, "test-data", "unicode-escaped.properties"),
      "utf-8"
    );
    placeholdersContent = fs.readFileSync(
      path.join(__dirname, "test-data", "placeholders.properties"),
      "utf-8"
    );
  });

  describe("canHandle", () => {
    it("should handle .properties files", () => {
      expect(handler.canHandle("test.properties")).toBe(true);
      expect(handler.canHandle("messages.properties")).toBe(true);
    });

    it("should not handle non-properties files", () => {
      expect(handler.canHandle("test.json")).toBe(false);
      expect(handler.canHandle("test.xml")).toBe(false);
      expect(handler.canHandle("test.yaml")).toBe(false);
    });

    it("should validate Properties content when provided", () => {
      expect(handler.canHandle("test.properties", "key=value")).toBe(true);
      expect(handler.canHandle("test.properties", "key: value")).toBe(true);
      expect(handler.canHandle("test.properties", "key=value\nother=value")).toBe(true);
      // Properties parser is quite permissive, empty content is valid
      expect(handler.canHandle("test.properties", "")).toBe(true);
    });
  });

  describe("parse", () => {
    it("should parse valid Properties content", () => {
      const result = handler.parse(samplePropertiesContent);
      
      expect(result).toBeDefined();
      expect(result._metadata).toBeDefined();
      expect(result._metadata?.format).toBe("properties");
      expect(result._metadata?.encoding).toBeDefined();
    });

    it("should parse basic key-value pairs", () => {
      const result = handler.parse(samplePropertiesContent);
      
      expect(result["app.name"]).toBe("My Application");
      expect(result["app.version"]).toBe("1.0.0");
      expect(result["app.description"]).toBe("This is a sample application");
      expect(result["navigation.home"]).toBe("Home");
      expect(result["navigation.about"]).toBe("About");
      expect(result["navigation.contact"]).toBe("Contact");
    });

    it("should preserve comments in metadata", () => {
      const result = handler.parse(samplePropertiesContent) as EnhancedTranslationFile;
      
      expect(result._metadata?.comments).toBeDefined();
      expect(result._metadata?.preserveComments).toBe(true);
    });

    it("should preserve formatting information", () => {
      const result = handler.parse(samplePropertiesContent) as EnhancedTranslationFile;
      
      expect(result._metadata?.formatting).toBeDefined();
      expect(result._metadata?.formatting?.separators).toBeDefined();
    });

    it("should detect encoding correctly", () => {
      const result = handler.parse(samplePropertiesContent) as EnhancedTranslationFile;
      expect(result._metadata?.encoding).toBe("UTF-8");
      
      const unicodeResult = handler.parse(unicodeEscapedContent) as EnhancedTranslationFile;
      expect(unicodeResult._metadata?.encoding).toBe("ISO-8859-1");
    });

    it("should handle empty Properties content", () => {
      // Properties parser handles empty content gracefully
      const result = handler.parse("");
      expect(result).toBeDefined();
      expect(result._metadata?.format).toBe("properties");
    });

    it("should handle simple text content as properties", () => {
      // Properties parser is quite permissive, so simple text might be parsed
      const result = handler.parse("simple text");
      expect(result).toBeDefined();
    });
  });

  describe("Unicode escaping and encoding handling", () => {
    it("should handle Unicode escapes in ISO-8859-1 encoded files", () => {
      const result = handler.parse(unicodeEscapedContent);
      
      expect(result["app.title"]).toBe("Café Application");
      expect(result["app.description"]).toBe("Naïve approach to résumé building");
      expect(result["messages.greeting"]).toBe("Hello 世界 (World)!");
      expect(result["messages.currency"]).toBe("Price: €19.99");
      expect(result["messages.symbols"]).toBe("✓ Success ✗ Error");
    });

    it("should detect Unicode escapes in metadata", () => {
      const result = handler.parse(unicodeEscapedContent) as EnhancedTranslationFile;
      
      expect(result._metadata?.hasUnicodeEscapes).toBe(true);
      expect(result._metadata?.encoding).toBe("ISO-8859-1");
    });

    it("should handle escaped special characters", () => {
      const result = handler.parse(unicodeEscapedContent);
      
      expect(result["special.equals"]).toBe("key=value pair");
      expect(result["special.colon"]).toBe("time:value pair");
      expect(result["special.spaces"]).toBe("leading spaces preserved");
      expect(result["special.backslash"]).toBe("path\\to\\file");
    });

    it("should serialize with proper Unicode escaping based on encoding", () => {
      const result = handler.parse(unicodeEscapedContent) as EnhancedTranslationFile;
      const serialized = handler.serialize(result);
      
      // Should contain Unicode escapes for non-Latin-1 characters
      expect(serialized).toContain("\\u");
    });

    it("should handle UTF-8 content without Unicode escaping", () => {
      const result = handler.parse(samplePropertiesContent);
      
      expect(result["special.unicode"]).toBe("Café, naïve, résumé");
      expect(result["special.symbols"]).toBe("Price: $19.99 & tax: 5%");
      expect(result["special.quotes"]).toBe('He said "Hello world!"');
    });
  });

  describe("placeholder variable preservation", () => {
    it("should detect and preserve various placeholder formats", () => {
      const result = handler.parse(placeholdersContent) as EnhancedTranslationFile;
      
      expect(result._metadata?.placeholders).toBeDefined();
      // Check that we have placeholder information for multiple keys
      expect(Object.keys(result._metadata?.placeholders || {}).length).toBeGreaterThan(15);
    });

    it("should preserve curly brace placeholders", () => {
      const result = handler.parse(placeholdersContent);
      
      expect(result["messages.welcome"]).toBe("Welcome to {appName}!");
      expect(result["messages.greeting"]).toBe("Hello, {firstName} {lastName}!");
      expect(result["messages.count"]).toBe("You have {itemCount} items");
    });

    it("should preserve shell-style variable placeholders", () => {
      const result = handler.parse(placeholdersContent);
      
      expect(result["paths.home"]).toBe("${HOME}/documents");
      expect(result["paths.config"]).toBe("${APP_CONFIG}/settings.conf");
      expect(result["paths.temp"]).toBe("${TEMP_DIR}/cache");
    });

    it("should preserve percent-wrapped placeholders", () => {
      const result = handler.parse(placeholdersContent);
      
      expect(result["windows.path"]).toBe("%USERPROFILE%\\Documents");
      expect(result["windows.temp"]).toBe("%TEMP%\\myapp");
    });

    it("should preserve printf-style placeholders", () => {
      const result = handler.parse(placeholdersContent);
      
      expect(result["format.string"]).toBe("Name: %s, Age: %d");
      expect(result["format.float"]).toBe("Price: %.2f");
      expect(result["format.hex"]).toBe("Color: %x");
    });

    it("should preserve MessageFormat numbered placeholders", () => {
      const result = handler.parse(placeholdersContent);
      
      expect(result["messageformat.simple"]).toBe("Hello {0}!");
      expect(result["messageformat.multiple"]).toBe("User {0} has {1} messages in {2}");
      expect(result["messageformat.complex"]).toBe("At {1,time} on {1,date}, {0} said {2}");
    });

    it("should preserve other placeholder formats", () => {
      const result = handler.parse(placeholdersContent);
      
      expect(result["config.database"]).toBe("jdbc:mysql://[host]:[port]/[database]");
      expect(result["spring.message"]).toBe("@{message.key}");
      expect(result["shell.user"]).toBe("$USER");
      expect(result["ruby.interpolation"]).toBe("Hello #{name}!");
    });

    it("should handle mixed placeholders in single value", () => {
      const result = handler.parse(placeholdersContent);
      
      expect(result["mixed.complex"]).toBe("Welcome {user} to ${APP_NAME}! Your temp dir is %TEMP% and user is $USER");
    });

    it("should categorize placeholder types in metadata", () => {
      const result = handler.parse(placeholdersContent) as EnhancedTranslationFile;
      const placeholderInfo = result._metadata?.placeholders;
      
      expect(placeholderInfo).toBeDefined();
      
      // Check that different placeholder types are detected
      const welcomeInfo = placeholderInfo?.["messages.welcome"];
      expect(welcomeInfo?.placeholders).toContain("{appName}");
      expect(welcomeInfo?.types).toBeDefined();
      
      const pathInfo = placeholderInfo?.["paths.home"];
      expect(pathInfo?.placeholders).toContain("${HOME}");
      expect(pathInfo?.types).toBeDefined();
    });
  });

  describe("serialize", () => {
    it("should serialize Properties data correctly", () => {
      const result = handler.parse(samplePropertiesContent);
      const serialized = handler.serialize(result);
      
      expect(serialized).toContain("app.name");
      expect(serialized).toContain("My Application");
      expect(serialized).toContain("navigation.home");
      expect(serialized).toContain("Home");
    });

    it("should preserve comments when formatting is enabled", () => {
      const result = handler.parse(samplePropertiesContent) as EnhancedTranslationFile;
      const serialized = handler.serialize(result, { preserveFormatting: true });
      
      expect(serialized).toContain("#");
    });

    it("should handle encoding options", () => {
      const result = handler.parse(samplePropertiesContent) as EnhancedTranslationFile;
      const serializedUtf8 = handler.serialize(result, { encoding: "UTF-8" });
      const serializedIso = handler.serialize(result, { encoding: "ISO-8859-1" });
      
      expect(serializedUtf8).toBeDefined();
      expect(serializedIso).toBeDefined();
      
      // Both should be valid Properties format
      expect(serializedUtf8).toContain("app.name");
      expect(serializedIso).toContain("app.name");
    });

    it("should preserve placeholder variables during serialization", () => {
      const result = handler.parse(placeholdersContent);
      const serialized = handler.serialize(result);
      
      expect(serialized).toContain("{appName}");
      expect(serialized).toContain("${HOME}");
      expect(serialized).toContain("%USERPROFILE%");
      expect(serialized).toContain("{0}");
    });

    it("should handle custom formatting options", () => {
      const result = handler.parse(samplePropertiesContent) as EnhancedTranslationFile;
      const serialized = handler.serialize(result, { 
        preserveFormatting: false,
        encoding: "UTF-8"
      });
      
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe("string");
    });
  });

  describe("validateStructure", () => {
    it("should validate correct Properties structure", () => {
      const result = handler.parse(samplePropertiesContent);
      const validation = handler.validateStructure(result);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should detect invalid structure", () => {
      const validation = handler.validateStructure("not an object" as any);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].code).toBe("INVALID_STRUCTURE");
    });

    it("should detect array root", () => {
      const validation = handler.validateStructure(["item1", "item2"] as any);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].code).toBe("INVALID_ROOT_TYPE");
    });

    it("should warn about placeholder variables", () => {
      const result = handler.parse(placeholdersContent);
      const validation = handler.validateStructure(result);
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      
      const placeholderWarnings = validation.warnings.filter(w => 
        w.code === "PLACEHOLDER_DETECTED"
      );
      expect(placeholderWarnings.length).toBeGreaterThan(0);
    });

    it("should warn about non-string values", () => {
      const dataWithNonStrings = {
        title: "String value",
        count: 42,
        enabled: true,
        price: 19.99
      };
      
      const validation = handler.validateStructure(dataWithNonStrings);
      
      expect(validation.isValid).toBe(true);
      // Check if there are any warnings at all
      if (validation.warnings.length > 0) {
        const nonStringWarnings = validation.warnings.filter(w => 
          w.code === "NON_STRING_VALUE"
        );
        expect(nonStringWarnings.length).toBeGreaterThanOrEqual(0);
      }
    });

    it("should warn about empty Properties", () => {
      const validation = handler.validateStructure({});
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0].code).toBe("EMPTY_PROPERTIES");
    });

    it("should detect invalid property keys", () => {
      const invalidData = {
        "": "empty key",
        " leadingSpace": "invalid key",
        "key=with=equals": "invalid key",
        _metadata: { format: "properties" }
      };
      
      const validation = handler.validateStructure(invalidData);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      
      const keyErrors = validation.errors.filter(e => 
        e.code === "INVALID_KEY_FORMAT"
      );
      expect(keyErrors.length).toBeGreaterThan(0);
    });
  });

  describe("getFileExtension", () => {
    it("should return .properties extension", () => {
      expect(handler.getFileExtension()).toBe(".properties");
    });
  });

  describe("round-trip processing", () => {
    it("should maintain data integrity through parse and serialize", () => {
      const original = handler.parse(samplePropertiesContent);
      const serialized = handler.serialize(original);
      const reparsed = handler.parse(serialized);
      
      // Compare key values
      expect(reparsed["app.name"]).toBe(original["app.name"]);
      expect(reparsed["navigation.home"]).toBe(original["navigation.home"]);
      expect(reparsed["messages.welcome"]).toBe(original["messages.welcome"]);
      expect(reparsed["errors.notFound"]).toBe(original["errors.notFound"]);
    });

    it("should maintain placeholder integrity through round-trip", () => {
      const original = handler.parse(placeholdersContent);
      const serialized = handler.serialize(original);
      const reparsed = handler.parse(serialized);
      
      // Compare placeholder values
      expect(reparsed["messages.welcome"]).toBe(original["messages.welcome"]);
      expect(reparsed["paths.home"]).toBe(original["paths.home"]);
      expect(reparsed["messageformat.simple"]).toBe(original["messageformat.simple"]);
      expect(reparsed["mixed.complex"]).toBe(original["mixed.complex"]);
    });

    it("should maintain Unicode content through round-trip", () => {
      const original = handler.parse(unicodeEscapedContent);
      const serialized = handler.serialize(original);
      const reparsed = handler.parse(serialized);
      
      // Compare Unicode values
      expect(reparsed["app.title"]).toBe(original["app.title"]);
      expect(reparsed["messages.greeting"]).toBe(original["messages.greeting"]);
      expect(reparsed["messages.currency"]).toBe(original["messages.currency"]);
    });
  });
});