import { ArbHandler } from "../src/format/arb-handler";

describe("ArbHandler", () => {
  let handler: ArbHandler;

  beforeEach(() => {
    handler = new ArbHandler();
  });

  describe("canHandle", () => {
    it("should handle .arb files", () => {
      expect(handler.canHandle("test.arb")).toBe(true);
    });

    it("should not handle non-.arb files", () => {
      expect(handler.canHandle("test.json")).toBe(false);
      expect(handler.canHandle("test.xml")).toBe(false);
    });

    it("should validate ARB content structure with @@locale metadata", () => {
      const validArbContent = JSON.stringify({
        "@@locale": "en",
        "hello": "Hello",
        "@hello": {
          "description": "A greeting"
        }
      });
      
      expect(handler.canHandle("test.arb", validArbContent)).toBe(true);
    });

    it("should validate ARB content structure with resource metadata", () => {
      const validArbContent = JSON.stringify({
        "hello": "Hello",
        "@hello": {
          "description": "A greeting"
        }
      });
      
      expect(handler.canHandle("test.arb", validArbContent)).toBe(true);
    });

    it("should reject invalid JSON content", () => {
      const invalidContent = "{ invalid json }";
      expect(handler.canHandle("test.arb", invalidContent)).toBe(false);
    });

    it("should reject non-ARB JSON structure", () => {
      const nonArbContent = JSON.stringify({
        "key1": "value1",
        "key2": "value2"
      });
      
      expect(handler.canHandle("test.arb", nonArbContent)).toBe(false);
    });
  });

  describe("parse - Basic ARB parsing", () => {
    it("should parse basic ARB file with minimal structure", () => {
      const arbContent = JSON.stringify({
        "@@locale": "en",
        "hello": "Hello",
        "goodbye": "Goodbye"
      });

      const result = handler.parse(arbContent);
      
      expect(result.hello).toBe("Hello");
      expect(result.goodbye).toBe("Goodbye");
      expect(result._metadata?.format).toBe("arb");
      expect(result._metadata?.sourceLanguage).toBe("en");
      expect(result._metadata?.arbMetadata?.["@@locale"]).toBe("en");
    });

    it("should parse ARB file with complete metadata", () => {
      const arbContent = JSON.stringify({
        "@@locale": "en_US",
        "@@last_modified": "2023-01-01T00:00:00.000Z",
        "@@author": "Test Author",
        "@@context": "Test context",
        "hello": "Hello",
        "goodbye": "Goodbye",
        "@hello": {
          "description": "A greeting",
          "type": "text"
        },
        "@goodbye": {
          "description": "A farewell",
          "context": "polite"
        }
      });

      const result = handler.parse(arbContent);
      
      expect(result.hello).toBe("Hello");
      expect(result.goodbye).toBe("Goodbye");
      expect(result._metadata?.format).toBe("arb");
      expect(result._metadata?.sourceLanguage).toBe("en_US");
      expect(result._metadata?.arbMetadata).toEqual({
        "@@locale": "en_US",
        "@@last_modified": "2023-01-01T00:00:00.000Z",
        "@@author": "Test Author",
        "@@context": "Test context"
      });
      expect(result._metadata?.resourceMetadata?.["@hello"]).toEqual({
        description: "A greeting",
        type: "text"
      });
      expect(result._metadata?.resourceMetadata?.["@goodbye"]).toEqual({
        description: "A farewell",
        context: "polite"
      });
    });

    it("should handle ARB file without @@locale metadata", () => {
      const arbContent = JSON.stringify({
        "hello": "Hello",
        "@hello": {
          "description": "A greeting"
        }
      });

      const result = handler.parse(arbContent);
      
      expect(result.hello).toBe("Hello");
      expect(result._metadata?.format).toBe("arb");
      expect(result._metadata?.sourceLanguage).toBeUndefined();
    });

    it("should preserve original structure in metadata", () => {
      const originalStructure = {
        "@@locale": "en",
        "hello": "Hello",
        "@hello": {
          "description": "A greeting"
        }
      };
      const arbContent = JSON.stringify(originalStructure);

      const result = handler.parse(arbContent);
      
      expect(result._metadata?.originalStructure).toEqual(originalStructure);
    });

    it("should throw error for invalid JSON", () => {
      const invalidContent = "{ invalid json }";
      
      expect(() => handler.parse(invalidContent)).toThrow("Failed to parse ARB");
    });

    it("should throw error for invalid ARB structure", () => {
      const nonArbContent = JSON.stringify({
        "key1": "value1",
        "key2": "value2"
      });
      
      expect(() => handler.parse(nonArbContent)).toThrow("Invalid ARB file structure");
    });
  });

  describe("parse - ICU message format handling", () => {
    it("should parse ARB with simple ICU placeholders", () => {
      const arbContent = JSON.stringify({
        "@@locale": "en",
        "greeting": "Hello {name}!",
        "@greeting": {
          "description": "Personalized greeting",
          "placeholders": {
            "name": {
              "type": "String",
              "example": "John"
            }
          }
        }
      });

      const result = handler.parse(arbContent);
      
      expect(result.greeting).toBe("Hello {name}!");
      expect(result._metadata?.icuAnalysis?.greeting?.hasIcuSyntax).toBe(true);
      expect(result._metadata?.icuAnalysis?.greeting?.messageType).toBe("complex");
      expect(result._metadata?.icuAnalysis?.greeting?.placeholders).toContain("name");
    });

    it("should parse ARB with plural ICU messages", () => {
      const arbContent = JSON.stringify({
        "@@locale": "en",
        "itemCount": "{count, plural, =0 {no items} =1 {one item} other {# items}}",
        "@itemCount": {
          "description": "Number of items",
          "placeholders": {
            "count": {
              "type": "int",
              "example": "5"
            }
          }
        }
      });

      const result = handler.parse(arbContent);
      
      expect(result.itemCount).toBe("{count, plural, =0 {no items} =1 {one item} other {# items}}");
      expect(result._metadata?.icuAnalysis?.itemCount?.hasIcuSyntax).toBe(true);
      expect(result._metadata?.icuAnalysis?.itemCount?.messageType).toBe("plural");
      expect(result._metadata?.icuAnalysis?.itemCount?.placeholders).toContain("count");
      expect(result._metadata?.icuAnalysis?.itemCount?.pluralForms).toEqual(["=0", "=1", "other"]);
    });

    it("should parse ARB with select ICU messages", () => {
      const arbContent = JSON.stringify({
        "@@locale": "en",
        "genderMessage": "{gender, select, male {He is} female {She is} other {They are}} here",
        "@genderMessage": {
          "description": "Gender-specific message",
          "placeholders": {
            "gender": {
              "type": "String",
              "example": "male"
            }
          }
        }
      });

      const result = handler.parse(arbContent);
      
      expect(result.genderMessage).toBe("{gender, select, male {He is} female {She is} other {They are}} here");
      expect(result._metadata?.icuAnalysis?.genderMessage?.hasIcuSyntax).toBe(true);
      expect(result._metadata?.icuAnalysis?.genderMessage?.messageType).toBe("select");
      expect(result._metadata?.icuAnalysis?.genderMessage?.placeholders).toContain("gender");
      expect(result._metadata?.icuAnalysis?.genderMessage?.selectOptions).toEqual(["male", "female", "other"]);
    });

    it("should parse ARB with complex nested ICU messages", () => {
      const arbContent = JSON.stringify({
        "@@locale": "en",
        "complexMessage": "{count, plural, =0 {no {type}} =1 {one {type}} other {# {type, select, item {items} file {files} other {things}}}}",
        "@complexMessage": {
          "description": "Complex nested ICU message",
          "placeholders": {
            "count": {
              "type": "int",
              "example": "5"
            },
            "type": {
              "type": "String",
              "example": "item"
            }
          }
        }
      });

      const result = handler.parse(arbContent);
      
      expect(result.complexMessage).toBe("{count, plural, =0 {no {type}} =1 {one {type}} other {# {type, select, item {items} file {files} other {things}}}}");
      expect(result._metadata?.icuAnalysis?.complexMessage?.hasIcuSyntax).toBe(true);
      expect(result._metadata?.icuAnalysis?.complexMessage?.messageType).toBe("plural");
      expect(result._metadata?.icuAnalysis?.complexMessage?.placeholders).toEqual(expect.arrayContaining(["count", "type"]));
    });

    it("should handle messages without ICU syntax", () => {
      const arbContent = JSON.stringify({
        "@@locale": "en",
        "simpleMessage": "This is a simple message",
        "@simpleMessage": {
          "description": "A simple message without placeholders"
        }
      });

      const result = handler.parse(arbContent);
      
      expect(result.simpleMessage).toBe("This is a simple message");
      expect(result._metadata?.icuAnalysis?.simpleMessage?.hasIcuSyntax).toBe(false);
      expect(result._metadata?.icuAnalysis?.simpleMessage?.messageType).toBe("simple");
      expect(result._metadata?.icuAnalysis?.simpleMessage?.placeholders).toEqual([]);
    });
  });

  describe("parse - Metadata and placeholder preservation", () => {
    it("should preserve all ARB metadata types", () => {
      const arbContent = JSON.stringify({
        "@@locale": "en_US",
        "@@last_modified": "2023-01-01T00:00:00.000Z",
        "@@author": "Test Author",
        "@@context": "Test context",
        "@@custom_metadata": "Custom value",
        "hello": "Hello"
      });

      const result = handler.parse(arbContent);
      
      expect(result._metadata?.arbMetadata).toEqual({
        "@@locale": "en_US",
        "@@last_modified": "2023-01-01T00:00:00.000Z",
        "@@author": "Test Author",
        "@@context": "Test context",
        "@@custom_metadata": "Custom value"
      });
    });

    it("should preserve complete resource metadata", () => {
      const arbContent = JSON.stringify({
        "@@locale": "en",
        "greeting": "Hello {name}!",
        "@greeting": {
          "type": "text",
          "description": "A personalized greeting",
          "context": "informal",
          "placeholders": {
            "name": {
              "type": "String",
              "example": "John",
              "description": "The person's name"
            }
          }
        }
      });

      const result = handler.parse(arbContent);
      
      expect(result._metadata?.resourceMetadata?.["@greeting"]).toEqual({
        type: "text",
        description: "A personalized greeting",
        context: "informal",
        placeholders: {
          name: {
            type: "String",
            example: "John",
            description: "The person's name"
          }
        }
      });
    });

    it("should preserve complex placeholder metadata", () => {
      const arbContent = JSON.stringify({
        "@@locale": "en",
        "orderStatus": "Order {orderId} for {customerName} is {status}",
        "@orderStatus": {
          "description": "Order status message",
          "placeholders": {
            "orderId": {
              "type": "String",
              "example": "ORD-12345",
              "description": "Unique order identifier"
            },
            "customerName": {
              "type": "String",
              "example": "John Doe",
              "description": "Customer full name"
            },
            "status": {
              "type": "String",
              "example": "shipped",
              "description": "Current order status"
            }
          }
        }
      });

      const result = handler.parse(arbContent);
      
      expect(result._metadata?.resourceMetadata?.["@orderStatus"]?.placeholders).toEqual({
        orderId: {
          type: "String",
          example: "ORD-12345",
          description: "Unique order identifier"
        },
        customerName: {
          type: "String",
          example: "John Doe",
          description: "Customer full name"
        },
        status: {
          type: "String",
          example: "shipped",
          description: "Current order status"
        }
      });
    });

    it("should handle invalid resource metadata gracefully", () => {
      const arbContent = JSON.stringify({
        "@@locale": "en",
        "hello": "Hello",
        "@hello": "invalid metadata" // Should be an object
      });

      const result = handler.parse(arbContent);
      
      expect(result.hello).toBe("Hello");
      expect(result._metadata?.resourceMetadata?.["@hello"]).toEqual({});
    });

    it("should handle invalid placeholder metadata gracefully", () => {
      const arbContent = JSON.stringify({
        "@@locale": "en",
        "greeting": "Hello {name}",
        "@greeting": {
          "description": "A greeting",
          "placeholders": "invalid placeholders" // Should be an object
        }
      });

      const result = handler.parse(arbContent);
      
      expect(result.greeting).toBe("Hello {name}");
      expect(result._metadata?.resourceMetadata?.["@greeting"]).toEqual({
        description: "A greeting"
      });
    });
  });

  describe("serialize - Basic ARB serialization", () => {
    it("should serialize ARB file with proper structure ordering", () => {
      const data = {
        hello: "Hello",
        goodbye: "Goodbye",
        _metadata: {
          format: "arb",
          arbMetadata: {
            "@@locale": "en",
            "@@author": "Test Author",
            "@@last_modified": "2023-01-01T00:00:00.000Z"
          },
          resourceMetadata: {
            "@hello": {
              description: "A greeting"
            }
          }
        }
      };

      const result = handler.serialize(data);
      const parsed = JSON.parse(result);
      
      // Check that @@locale comes first
      const keys = Object.keys(parsed);
      expect(keys[0]).toBe("@@locale");
      
      expect(parsed["@@locale"]).toBe("en");
      expect(parsed["@@author"]).toBe("Test Author");
      expect(parsed.hello).toBe("Hello");
      expect(parsed.goodbye).toBe("Goodbye");
      expect(parsed["@hello"]).toEqual({
        description: "A greeting"
      });
      expect(parsed["@@last_modified"]).toBeDefined();
    });

    it("should update @@last_modified timestamp by default", () => {
      const data = {
        hello: "Hello",
        _metadata: {
          format: "arb",
          arbMetadata: {
            "@@locale": "en",
            "@@last_modified": "2020-01-01T00:00:00.000Z"
          }
        }
      };

      const result = handler.serialize(data);
      const parsed = JSON.parse(result);
      
      expect(parsed["@@last_modified"]).not.toBe("2020-01-01T00:00:00.000Z");
      expect(new Date(parsed["@@last_modified"])).toBeInstanceOf(Date);
    });

    it("should preserve @@last_modified when updateTimestamp is false", () => {
      const data = {
        hello: "Hello",
        _metadata: {
          format: "arb",
          arbMetadata: {
            "@@locale": "en",
            "@@last_modified": "2020-01-01T00:00:00.000Z"
          }
        }
      };

      const options = {
        customSettings: {
          updateTimestamp: false
        }
      };

      const result = handler.serialize(data, options);
      const parsed = JSON.parse(result);
      
      expect(parsed["@@last_modified"]).toBe("2020-01-01T00:00:00.000Z");
    });

    it("should handle custom indentation", () => {
      const data = {
        hello: "Hello",
        _metadata: {
          format: "arb",
          arbMetadata: {
            "@@locale": "en"
          }
        }
      };

      const result = handler.serialize(data, { indentation: 4 });
      
      expect(result).toContain('    "@@locale": "en"');
    });

    it("should serialize without metadata", () => {
      const data = {
        hello: "Hello",
        goodbye: "Goodbye"
      };

      const result = handler.serialize(data);
      const parsed = JSON.parse(result);
      
      expect(parsed.hello).toBe("Hello");
      expect(parsed.goodbye).toBe("Goodbye");
      expect(Object.keys(parsed)).toEqual(["goodbye", "hello"]); // Sorted order
    });

    it("should throw error for serialization failure", () => {
      const circularData = {};
      (circularData as any).self = circularData;

      expect(() => handler.serialize(circularData)).toThrow("Failed to serialize ARB");
    });
  });

  describe("serialize - ICU message format preservation", () => {
    it("should preserve ICU plural messages", () => {
      const data = {
        itemCount: "{count, plural, =0 {no items} =1 {one item} other {# items}}",
        _metadata: {
          format: "arb",
          arbMetadata: {
            "@@locale": "en"
          },
          resourceMetadata: {
            "@itemCount": {
              description: "Number of items",
              placeholders: {
                count: {
                  type: "int",
                  example: "5"
                }
              }
            }
          }
        }
      };

      const result = handler.serialize(data);
      const parsed = JSON.parse(result);
      
      expect(parsed.itemCount).toBe("{count, plural, =0 {no items} =1 {one item} other {# items}}");
      expect(parsed["@itemCount"]).toEqual({
        description: "Number of items",
        placeholders: {
          count: {
            type: "int",
            example: "5"
          }
        }
      });
    });

    it("should preserve ICU select messages", () => {
      const data = {
        genderMessage: "{gender, select, male {He is} female {She is} other {They are}} here",
        _metadata: {
          format: "arb",
          arbMetadata: {
            "@@locale": "en"
          },
          resourceMetadata: {
            "@genderMessage": {
              description: "Gender-specific message",
              placeholders: {
                gender: {
                  type: "String",
                  example: "male"
                }
              }
            }
          }
        }
      };

      const result = handler.serialize(data);
      const parsed = JSON.parse(result);
      
      expect(parsed.genderMessage).toBe("{gender, select, male {He is} female {She is} other {They are}} here");
      expect(parsed["@genderMessage"]).toEqual({
        description: "Gender-specific message",
        placeholders: {
          gender: {
            type: "String",
            example: "male"
          }
        }
      });
    });
  });

  describe("validateStructure", () => {
    it("should validate valid ARB structure", () => {
      const data = {
        "@@locale": "en",
        "hello": "Hello",
        "@hello": {
          "description": "A greeting"
        }
      };

      const result = handler.validateStructure(data);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject non-object data", () => {
      const result = handler.validateStructure("invalid data" as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].code).toBe("INVALID_STRUCTURE");
    });

    it("should warn about missing @@locale metadata", () => {
      const data = {
        "hello": "Hello"
      };

      const result = handler.validateStructure(data);
      
      expect(result.warnings.some(w => w.code === "MISSING_LOCALE_METADATA")).toBe(true);
    });

    it("should validate ARB metadata types", () => {
      const data = {
        "@@locale": 123, // Should be string
        "hello": "Hello"
      };

      const result = handler.validateStructure(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_METADATA_TYPE")).toBe(true);
    });

    it("should warn about invalid locale format", () => {
      const data = {
        "@@locale": "invalid-locale-format",
        "hello": "Hello"
      };

      const result = handler.validateStructure(data);
      
      expect(result.warnings.some(w => w.code === "INVALID_LOCALE_FORMAT")).toBe(true);
    });

    it("should detect orphaned metadata", () => {
      const data = {
        "@@locale": "en",
        "hello": "Hello",
        "@goodbye": {
          "description": "A farewell"
        }
      };

      const result = handler.validateStructure(data);
      
      expect(result.warnings.some(w => w.code === "ORPHANED_METADATA")).toBe(true);
    });

    it("should validate resource metadata structure", () => {
      const data = {
        "@@locale": "en",
        "hello": "Hello",
        "@hello": "invalid metadata" // Should be object
      };

      const result = handler.validateStructure(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_RESOURCE_METADATA")).toBe(true);
    });

    it("should warn about unknown metadata properties", () => {
      const data = {
        "@@locale": "en",
        "hello": "Hello",
        "@hello": {
          "description": "A greeting",
          "unknownProperty": "value"
        }
      };

      const result = handler.validateStructure(data);
      
      expect(result.warnings.some(w => w.code === "UNKNOWN_METADATA_PROPERTY")).toBe(true);
    });

    it("should validate placeholder structure", () => {
      const data = {
        "@@locale": "en",
        "greeting": "Hello {name}",
        "@greeting": {
          "placeholders": "invalid" // Should be object
        }
      };

      const result = handler.validateStructure(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_PLACEHOLDERS")).toBe(true);
    });

    it("should validate individual placeholder data", () => {
      const data = {
        "@@locale": "en",
        "greeting": "Hello {name}",
        "@greeting": {
          "placeholders": {
            "name": "invalid" // Should be object
          }
        }
      };

      const result = handler.validateStructure(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === "INVALID_PLACEHOLDER_DATA")).toBe(true);
    });

    it("should detect ICU syntax errors - missing comma", () => {
      const data = {
        "@@locale": "en",
        "badIcu": "{count plural =0 {no items}}", // Missing comma after count
      };

      const result = handler.validateStructure(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === "ICU_MISSING_COMMA")).toBe(true);
    });

    it("should detect ICU syntax errors - bracket mismatch", () => {
      const data = {
        "@@locale": "en",
        "badIcu": "{count, plural, =0 {no items} =1 {one item}", // Missing closing bracket
      };

      const result = handler.validateStructure(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === "ICU_BRACKET_MISMATCH")).toBe(true);
    });

    it("should detect missing 'other' in plural forms", () => {
      const data = {
        "@@locale": "en",
        "badPlural": "{count, plural, =0 {no items} =1 {one item}}", // Missing 'other'
      };

      const result = handler.validateStructure(data);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.code === "ICU_MISSING_OTHER_PLURAL")).toBe(true);
    });

    it("should warn about missing 'other' in select forms", () => {
      const data = {
        "@@locale": "en",
        "selectMessage": "{gender, select, male {He} female {She}}", // Missing 'other'
      };

      const result = handler.validateStructure(data);
      
      expect(result.warnings.some(w => w.code === "ICU_MISSING_OTHER_SELECT")).toBe(true);
    });

    it("should detect placeholder metadata inconsistencies", () => {
      const data = {
        "@@locale": "en",
        "greeting": "Hello {name}",
        "@greeting": {
          "placeholders": {
            "wrongName": { // Doesn't match {name} in message
              "type": "String"
            }
          }
        }
      };

      const result = handler.validateStructure(data);
      
      expect(result.warnings.some(w => w.code === "MISSING_PLACEHOLDER_METADATA")).toBe(true);
      expect(result.warnings.some(w => w.code === "EXTRA_PLACEHOLDER_METADATA")).toBe(true);
    });

    it("should warn about ICU messages without placeholder metadata", () => {
      const data = {
        "@@locale": "en",
        "greeting": "Hello {name}" // Has ICU but no metadata
      };

      const result = handler.validateStructure(data);
      
      expect(result.warnings.some(w => w.code === "MISSING_PLACEHOLDER_METADATA")).toBe(true);
    });
  });

  describe("getFileExtension", () => {
    it("should return .arb extension", () => {
      expect(handler.getFileExtension()).toBe(".arb");
    });
  });
});