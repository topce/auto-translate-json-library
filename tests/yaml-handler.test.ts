import { YamlHandler } from "../src/format/yaml-handler";
import * as fs from "node:fs";
import * as path from "node:path";

describe("YamlHandler", () => {
  let handler: YamlHandler;
  let sampleYamlContent: string;

  beforeEach(() => {
    handler = new YamlHandler();
    sampleYamlContent = fs.readFileSync(
      path.join(__dirname, "test-data", "sample.yaml"),
      "utf-8"
    );
  });

  describe("canHandle", () => {
    it("should handle .yaml files", () => {
      expect(handler.canHandle("test.yaml")).toBe(true);
    });

    it("should handle .yml files", () => {
      expect(handler.canHandle("test.yml")).toBe(true);
    });

    it("should not handle other file types", () => {
      expect(handler.canHandle("test.json")).toBe(false);
      expect(handler.canHandle("test.xml")).toBe(false);
    });

    it("should validate YAML content when provided", () => {
      expect(handler.canHandle("test.yaml", "key: value")).toBe(true);
      expect(handler.canHandle("test.yaml", "invalid: yaml: content:")).toBe(false);
    });
  });

  describe("parse", () => {
    it("should parse valid YAML content", () => {
      const result = handler.parse(sampleYamlContent);
      
      expect(result).toBeDefined();
      expect(result._metadata).toBeDefined();
      expect(result._metadata?.format).toBe("yaml");
      expect(result._metadata?.preserveComments).toBe(true);
    });

    it("should flatten nested structures", () => {
      const result = handler.parse(sampleYamlContent);
      
      expect(result["app.title"]).toBe("My Application");
      expect(result["navigation.home"]).toBe("Home");
      expect(result["messages.errors.notFound"]).toBe("Page not found");
    });

    it("should preserve non-string values", () => {
      const result = handler.parse(sampleYamlContent);
      
      expect(result["app.version"]).toBe("1.0.0"); // This is a string in the YAML
      expect(result["app.isActive"]).toBe(true);
      expect(result["settings.notifications.sms"]).toBe(null);
      expect(result["metadata.config.maxUsers"]).toBe(1000); // This is a number
      expect(result["metadata.config.timeout"]).toBe(30.5); // This is a float
      expect(result["metadata.config.debug"]).toBe(false); // This is a boolean
    });

    it("should handle arrays", () => {
      const result = handler.parse(sampleYamlContent);
      
      expect(result["features[0]"]).toBe("Feature One");
      expect(result["features[1]"]).toBe("Feature Two");
      expect(result["features[2]"]).toBe("Feature Three");
    });

    it("should throw error for invalid YAML", () => {
      expect(() => {
        handler.parse("invalid: yaml: content:");
      }).toThrow("Failed to parse YAML");
    });

    it("should throw error for empty YAML", () => {
      expect(() => {
        handler.parse("");
      }).toThrow("YAML file is empty");
    });

    it("should throw error for array root", () => {
      expect(() => {
        handler.parse("- item1\n- item2");
      }).toThrow("YAML root must be an object");
    });
  });

  describe("serialize", () => {
    it("should serialize flattened data back to YAML", () => {
      const parsed = handler.parse(sampleYamlContent);
      const serialized = handler.serialize(parsed);
      
      expect(serialized).toContain("app:");
      expect(serialized).toContain("title: My Application");
      expect(serialized).toContain("navigation:");
      expect(serialized).toContain("home: Home");
    });

    it("should preserve non-string values in serialization", () => {
      const parsed = handler.parse(sampleYamlContent);
      const serialized = handler.serialize(parsed);
      
      expect(serialized).toContain("version: 1.0.0");
      expect(serialized).toContain("isActive: true");
      expect(serialized).toContain("sms: null");
      expect(serialized).toContain("maxUsers: 1000");
      expect(serialized).toContain("timeout: 30.5");
      expect(serialized).toContain("debug: false");
    });

    it("should handle custom formatting options", () => {
      const parsed = handler.parse(sampleYamlContent);
      const serialized = handler.serialize(parsed, { indentation: 4 });
      
      expect(serialized).toBeDefined();
      expect(typeof serialized).toBe("string");
    });
  });

  describe("validateStructure", () => {
    it("should validate correct YAML structure", () => {
      const parsed = handler.parse(sampleYamlContent);
      const validation = handler.validateStructure(parsed);
      
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

    it("should warn about non-translatable values", () => {
      const parsed = handler.parse(sampleYamlContent);
      const validation = handler.validateStructure(parsed);
      
      expect(validation.warnings.length).toBeGreaterThan(0);
      const nonTranslatableWarnings = validation.warnings.filter(w => 
        w.code === "NON_TRANSLATABLE_VALUE_PRESERVED"
      );
      expect(nonTranslatableWarnings.length).toBeGreaterThan(0);
    });

    it("should warn about empty YAML", () => {
      const validation = handler.validateStructure({});
      
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toHaveLength(1);
      expect(validation.warnings[0].code).toBe("EMPTY_YAML");
    });
  });

  describe("getFileExtension", () => {
    it("should return .yaml extension", () => {
      expect(handler.getFileExtension()).toBe(".yaml");
    });
  });

  describe("round-trip processing", () => {
    it("should maintain data integrity through parse and serialize", () => {
      const original = handler.parse(sampleYamlContent);
      const serialized = handler.serialize(original);
      const reparsed = handler.parse(serialized);
      
      // Compare translatable string values
      expect(reparsed["app.title"]).toBe(original["app.title"]);
      expect(reparsed["navigation.home"]).toBe(original["navigation.home"]);
      expect(reparsed["messages.errors.notFound"]).toBe(original["messages.errors.notFound"]);
      
      // Compare non-string values
      expect(reparsed["app.version"]).toBe(original["app.version"]);
      expect(reparsed["app.isActive"]).toBe(original["app.isActive"]);
      expect(reparsed["metadata.config.maxUsers"]).toBe(original["metadata.config.maxUsers"]);
      expect(reparsed["metadata.config.debug"]).toBe(original["metadata.config.debug"]);
    });
  });
});