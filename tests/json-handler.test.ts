import { JsonHandler } from '../src/format/json-handler';
import type { EnhancedTranslationFile } from '../src/format.interface';
import * as fs from 'fs';
import * as path from 'path';

describe('JsonHandler', () => {
  let handler: JsonHandler;

  beforeEach(() => {
    handler = new JsonHandler();
  });

  describe('canHandle', () => {
    it('should handle .json files', () => {
      expect(handler.canHandle('test.json')).toBe(true);
      expect(handler.canHandle('translations.json')).toBe(true);
    });

    it('should not handle non-json files', () => {
      expect(handler.canHandle('test.xml')).toBe(false);
      expect(handler.canHandle('test.txt')).toBe(false);
    });

    it('should validate JSON content when provided', () => {
      expect(handler.canHandle('test.json', '{"key": "value"}')).toBe(true);
      expect(handler.canHandle('test.json', 'invalid json')).toBe(false);
    });
  });

  describe('flat JSON parsing', () => {
    const flatJson = `{
      "app_name": "My Application",
      "welcome_message": "Welcome to our app!",
      "button_text": "Click here",
      "error_message": "Something went wrong"
    }`;

    it('should parse flat JSON correctly', () => {
      const result = handler.parse(flatJson);
      
      expect(result.app_name).toBe('My Application');
      expect(result.welcome_message).toBe('Welcome to our app!');
      expect(result.button_text).toBe('Click here');
      expect(result.error_message).toBe('Something went wrong');
    });

    it('should preserve metadata for flat JSON', () => {
      const result = handler.parse(flatJson) as EnhancedTranslationFile;
      
      expect(result._metadata).toBeDefined();
      expect(result._metadata?.format).toBe('json');
      expect(result._metadata?.originalStructure).toBeDefined();
      expect(result._metadata?.preserveComments).toBe(false);
      expect(result._metadata?.preserveAttributes).toBe(false);
    });
  });

  describe('nested JSON parsing', () => {
    const nestedJson = `{
      "app": {
        "name": "My Application",
        "version": "1.0.0"
      },
      "messages": {
        "welcome": "Welcome to our app!",
        "errors": {
          "network": "Network connection failed",
          "validation": "Please check your input"
        }
      },
      "buttons": {
        "submit": "Submit",
        "cancel": "Cancel"
      }
    }`;

    it('should flatten nested JSON structure correctly', () => {
      const result = handler.parse(nestedJson);
      
      expect(result['app.name']).toBe('My Application');
      expect(result['app.version']).toBe('1.0.0');
      expect(result['messages.welcome']).toBe('Welcome to our app!');
      expect(result['messages.errors.network']).toBe('Network connection failed');
      expect(result['messages.errors.validation']).toBe('Please check your input');
      expect(result['buttons.submit']).toBe('Submit');
      expect(result['buttons.cancel']).toBe('Cancel');
    });

    it('should preserve original nested structure in metadata', () => {
      const result = handler.parse(nestedJson) as EnhancedTranslationFile;
      
      expect(result._metadata?.originalStructure).toBeDefined();
      expect(result._metadata?.originalStructure.app).toBeDefined();
      expect(result._metadata?.originalStructure.messages).toBeDefined();
      expect(result._metadata?.originalStructure.messages.errors).toBeDefined();
    });

    it('should serialize back to nested structure correctly', () => {
      const translationData: EnhancedTranslationFile = {
        'app.name': 'Mi Aplicación',
        'app.version': '1.0.0',
        'messages.welcome': '¡Bienvenido a nuestra aplicación!',
        'messages.errors.network': 'Falló la conexión de red',
        'messages.errors.validation': 'Por favor verifica tu entrada',
        'buttons.submit': 'Enviar',
        'buttons.cancel': 'Cancelar',
        _metadata: {
          format: 'json',
          originalStructure: {
            app: { name: 'My Application', version: '1.0.0' },
            messages: {
              welcome: 'Welcome to our app!',
              errors: {
                network: 'Network connection failed',
                validation: 'Please check your input'
              }
            },
            buttons: { submit: 'Submit', cancel: 'Cancel' }
          }
        }
      };

      const result = handler.serialize(translationData);
      const parsed = JSON.parse(result);
      
      expect(parsed.app.name).toBe('Mi Aplicación');
      expect(parsed.app.version).toBe('1.0.0');
      expect(parsed.messages.welcome).toBe('¡Bienvenido a nuestra aplicación!');
      expect(parsed.messages.errors.network).toBe('Falló la conexión de red');
      expect(parsed.messages.errors.validation).toBe('Por favor verifica tu entrada');
      expect(parsed.buttons.submit).toBe('Enviar');
      expect(parsed.buttons.cancel).toBe('Cancelar');
    });
  });

  describe('array handling', () => {
    const arrayJson = `{
      "items": [
        "First item",
        "Second item",
        "Third item"
      ],
      "complex_items": [
        {
          "title": "Item 1",
          "description": "Description 1"
        },
        {
          "title": "Item 2", 
          "description": "Description 2"
        }
      ],
      "mixed_array": [
        "String item",
        42,
        true,
        {
          "nested": "Nested value"
        }
      ]
    }`;

    it('should handle arrays correctly', () => {
      const result = handler.parse(arrayJson);
      
      expect(result['items[0]']).toBe('First item');
      expect(result['items[1]']).toBe('Second item');
      expect(result['items[2]']).toBe('Third item');
      expect(result['complex_items[0].title']).toBe('Item 1');
      expect(result['complex_items[0].description']).toBe('Description 1');
      expect(result['complex_items[1].title']).toBe('Item 2');
      expect(result['complex_items[1].description']).toBe('Description 2');
      expect(result['mixed_array[0]']).toBe('String item');
      expect(result['mixed_array[1]']).toBe(42);
      expect(result['mixed_array[2]']).toBe(true);
      expect(result['mixed_array[3].nested']).toBe('Nested value');
    });

    it('should serialize arrays back correctly', () => {
      const translationData: EnhancedTranslationFile = {
        'items[0]': 'Primer elemento',
        'items[1]': 'Segundo elemento',
        'items[2]': 'Tercer elemento',
        'complex_items[0].title': 'Elemento 1',
        'complex_items[0].description': 'Descripción 1',
        'complex_items[1].title': 'Elemento 2',
        'complex_items[1].description': 'Descripción 2',
        _metadata: {
          format: 'json',
          originalStructure: {
            items: ['First item', 'Second item', 'Third item'],
            complex_items: [
              { title: 'Item 1', description: 'Description 1' },
              { title: 'Item 2', description: 'Description 2' }
            ]
          }
        }
      };

      const result = handler.serialize(translationData);
      const parsed = JSON.parse(result);
      
      expect(parsed.items).toHaveLength(3);
      expect(parsed.items[0]).toBe('Primer elemento');
      expect(parsed.items[1]).toBe('Segundo elemento');
      expect(parsed.items[2]).toBe('Tercer elemento');
      expect(parsed.complex_items[0].title).toBe('Elemento 1');
      expect(parsed.complex_items[0].description).toBe('Descripción 1');
      expect(parsed.complex_items[1].title).toBe('Elemento 2');
      expect(parsed.complex_items[1].description).toBe('Descripción 2');
    });
  });

  describe('metadata preservation', () => {
    const jsonWithMixedTypes = `{
      "strings": {
        "title": "My Title",
        "description": "My Description"
      },
      "numbers": {
        "count": 42,
        "price": 19.99
      },
      "booleans": {
        "enabled": true,
        "visible": false
      },
      "null_value": null
    }`;

    it('should preserve non-string values during parsing', () => {
      const result = handler.parse(jsonWithMixedTypes);
      
      expect(result['strings.title']).toBe('My Title');
      expect(result['strings.description']).toBe('My Description');
      expect(result['numbers.count']).toBe(42);
      expect(result['numbers.price']).toBe(19.99);
      expect(result['booleans.enabled']).toBe(true);
      expect(result['booleans.visible']).toBe(false);
      expect(result['null_value']).toBe(null);
    });

    it('should preserve non-string values during serialization', () => {
      const translationData: EnhancedTranslationFile = {
        'strings.title': 'Mi Título',
        'strings.description': 'Mi Descripción',
        'numbers.count': 42,
        'numbers.price': 19.99,
        'booleans.enabled': true,
        'booleans.visible': false,
        'null_value': null,
        _metadata: {
          format: 'json',
          originalStructure: {
            strings: { title: 'My Title', description: 'My Description' },
            numbers: { count: 42, price: 19.99 },
            booleans: { enabled: true, visible: false },
            null_value: null
          }
        }
      };

      const result = handler.serialize(translationData);
      const parsed = JSON.parse(result);
      
      expect(parsed.strings.title).toBe('Mi Título');
      expect(parsed.strings.description).toBe('Mi Descripción');
      expect(parsed.numbers.count).toBe(42);
      expect(parsed.numbers.price).toBe(19.99);
      expect(parsed.booleans.enabled).toBe(true);
      expect(parsed.booleans.visible).toBe(false);
      expect(parsed.null_value).toBe(null);
    });
  });

  describe('validation', () => {
    it('should validate correct JSON structure', () => {
      const validData = {
        title: 'Test Title',
        nested: {
          message: 'Test Message'
        }
      };

      const result = handler.validateStructure(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid JSON structure', () => {
      const invalidData = 'not an object';

      const result = handler.validateStructure(invalidData as any);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('INVALID_STRUCTURE');
    });

    it('should warn about non-translatable values', () => {
      const dataWithNonStrings = {
        title: 'Translatable string',
        count: 42,
        enabled: true,
        config: {
          timeout: 5000,
          message: 'Another translatable string'
        }
      };

      const result = handler.validateStructure(dataWithNonStrings);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      
      const nonTranslatableWarnings = result.warnings.filter(w => 
        w.code === 'NON_TRANSLATABLE_VALUE'
      );
      expect(nonTranslatableWarnings.length).toBeGreaterThan(0);
    });

    it('should handle empty JSON', () => {
      const emptyData = {};

      const result = handler.validateStructure(emptyData);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].code).toBe('EMPTY_JSON');
    });

    it('should detect circular references', () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;

      const result = handler.validateStructure(circularData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('CIRCULAR_REFERENCE');
    });
  });

  describe('formatting options', () => {
    it('should apply custom indentation', () => {
      const data: EnhancedTranslationFile = {
        title: 'Test Title',
        message: 'Test Message'
      };

      const result = handler.serialize(data, { indentation: 4 });
      
      expect(result).toContain('    "title"');
      expect(result).toContain('    "message"');
    });

    it('should use string indentation', () => {
      const data: EnhancedTranslationFile = {
        title: 'Test Title',
        message: 'Test Message'
      };

      const result = handler.serialize(data, { indentation: '\t' });
      
      expect(result).toContain('\t"title"');
      expect(result).toContain('\t"message"');
    });

    it('should use default indentation when not specified', () => {
      const data: EnhancedTranslationFile = {
        title: 'Test Title'
      };

      const result = handler.serialize(data);
      
      // Default should be 2 spaces
      expect(result).toContain('  "title"');
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid JSON content', () => {
      const invalidJson = '{ invalid json content }';
      
      expect(() => handler.parse(invalidJson)).toThrow('Failed to parse JSON');
    });

    it('should throw error for malformed JSON', () => {
      const malformedJson = '{"key": "value",}'; // trailing comma
      
      expect(() => handler.parse(malformedJson)).toThrow('Failed to parse JSON');
    });
  });

  describe('getFileExtension', () => {
    it('should return .json extension', () => {
      expect(handler.getFileExtension()).toBe('.json');
    });
  });

  describe('reconstruction from flat structure', () => {
    it('should reconstruct nested structure from dot notation', () => {
      const flatData = {
        'app.name': 'Test App',
        'app.version': '1.0.0',
        'messages.welcome': 'Welcome!',
        'messages.errors.network': 'Network error'
      };

      const result = handler.serialize(flatData);
      const parsed = JSON.parse(result);
      
      expect(parsed.app.name).toBe('Test App');
      expect(parsed.app.version).toBe('1.0.0');
      expect(parsed.messages.welcome).toBe('Welcome!');
      expect(parsed.messages.errors.network).toBe('Network error');
    });

    it('should reconstruct arrays from bracket notation', () => {
      const flatData = {
        'items[0]': 'First',
        'items[1]': 'Second',
        'complex[0].title': 'Title 1',
        'complex[0].desc': 'Description 1',
        'complex[1].title': 'Title 2'
      };

      const result = handler.serialize(flatData);
      const parsed = JSON.parse(result);
      
      expect(parsed.items).toHaveLength(2);
      expect(parsed.items[0]).toBe('First');
      expect(parsed.items[1]).toBe('Second');
      expect(parsed.complex).toHaveLength(2);
      expect(parsed.complex[0].title).toBe('Title 1');
      expect(parsed.complex[0].desc).toBe('Description 1');
      expect(parsed.complex[1].title).toBe('Title 2');
    });
  });

  describe('enhanced JSON metadata preservation', () => {
    let nestedJsonContent: string;

    beforeAll(() => {
      nestedJsonContent = fs.readFileSync(
        path.join(__dirname, 'test-data', 'nested-json.json'),
        'utf-8'
      );
    });

    it('should preserve complete metadata for complex nested structures', () => {
      const result = handler.parse(nestedJsonContent) as EnhancedTranslationFile;
      
      expect(result._metadata).toBeDefined();
      expect(result._metadata?.format).toBe('json');
      expect(result._metadata?.originalStructure).toBeDefined();
      expect(result._metadata?.preserveComments).toBe(false);
      expect(result._metadata?.preserveAttributes).toBe(false);
      
      // Verify original structure is preserved
      const original = result._metadata?.originalStructure;
      expect(original.app.name).toBe('My Application');
      expect(original.app.config.timeout).toBe(5000);
      expect(original.messages.errors.network).toBe('Network connection failed');
      expect(original.arrays.items).toHaveLength(3);
      expect(original.arrays.complex_items).toHaveLength(2);
    });

    it('should correctly flatten deeply nested structures with mixed types', () => {
      const result = handler.parse(nestedJsonContent);
      
      // Test string values
      expect(result['app.name']).toBe('My Application');
      expect(result['app.version']).toBe('1.0.0');
      expect(result['messages.welcome']).toBe('Welcome to our app!');
      expect(result['messages.errors.network']).toBe('Network connection failed');
      expect(result['messages.errors.validation']).toBe('Please check your input');
      expect(result['messages.success.login']).toBe('Login successful');
      
      // Test non-string values are preserved
      expect(result['app.config.timeout']).toBe(5000);
      expect(result['app.config.retries']).toBe(3);
      expect(result['app.config.debug']).toBe(true);
      
      // Test array handling
      expect(result['arrays.items[0]']).toBe('First item');
      expect(result['arrays.items[1]']).toBe('Second item');
      expect(result['arrays.items[2]']).toBe('Third item');
      
      // Test complex array items
      expect(result['arrays.complex_items[0].title']).toBe('Item 1');
      expect(result['arrays.complex_items[0].description']).toBe('Description 1');
      expect(result['arrays.complex_items[0].priority']).toBe(1);
      expect(result['arrays.complex_items[1].title']).toBe('Item 2');
      expect(result['arrays.complex_items[1].description']).toBe('Description 2');
      expect(result['arrays.complex_items[1].priority']).toBe(2);
      
      // Test mixed array
      expect(result['arrays.mixed_array[0]']).toBe('String item');
      expect(result['arrays.mixed_array[1]']).toBe(42);
      expect(result['arrays.mixed_array[2]']).toBe(true);
      expect(result['arrays.mixed_array[3].nested']).toBe('Nested value');
    });

    it('should perfectly reconstruct original structure after translation', () => {
      const parsed = handler.parse(nestedJsonContent) as EnhancedTranslationFile;
      
      // Simulate translation by modifying string values
      const translated: EnhancedTranslationFile = {
        ...parsed,
        'app.name': 'Mi Aplicación',
        'app.version': '1.0.0', // Keep version unchanged
        'messages.welcome': '¡Bienvenido a nuestra aplicación!',
        'messages.errors.network': 'Falló la conexión de red',
        'messages.errors.validation': 'Por favor verifica tu entrada',
        'messages.errors.server': 'Ocurrió un error del servidor',
        'messages.success.login': 'Inicio de sesión exitoso',
        'messages.success.logout': 'Cierre de sesión exitoso',
        'buttons.submit': 'Enviar',
        'buttons.cancel': 'Cancelar',
        'buttons.retry': 'Reintentar',
        'arrays.items[0]': 'Primer elemento',
        'arrays.items[1]': 'Segundo elemento',
        'arrays.items[2]': 'Tercer elemento',
        'arrays.complex_items[0].title': 'Elemento 1',
        'arrays.complex_items[0].description': 'Descripción 1',
        'arrays.complex_items[1].title': 'Elemento 2',
        'arrays.complex_items[1].description': 'Descripción 2',
        'arrays.mixed_array[0]': 'Elemento de cadena',
        'arrays.mixed_array[3].nested': 'Valor anidado'
      };

      const serialized = handler.serialize(translated);
      const reconstructed = JSON.parse(serialized);
      
      // Verify structure is maintained
      expect(reconstructed.app.name).toBe('Mi Aplicación');
      expect(reconstructed.app.version).toBe('1.0.0');
      expect(reconstructed.app.config.timeout).toBe(5000); // Non-string preserved
      expect(reconstructed.app.config.retries).toBe(3);
      expect(reconstructed.app.config.debug).toBe(true);
      
      expect(reconstructed.messages.welcome).toBe('¡Bienvenido a nuestra aplicación!');
      expect(reconstructed.messages.errors.network).toBe('Falló la conexión de red');
      expect(reconstructed.messages.success.login).toBe('Inicio de sesión exitoso');
      
      expect(reconstructed.buttons.submit).toBe('Enviar');
      expect(reconstructed.buttons.cancel).toBe('Cancelar');
      
      // Verify arrays are reconstructed correctly
      expect(reconstructed.arrays.items).toHaveLength(3);
      expect(reconstructed.arrays.items[0]).toBe('Primer elemento');
      expect(reconstructed.arrays.items[1]).toBe('Segundo elemento');
      expect(reconstructed.arrays.items[2]).toBe('Tercer elemento');
      
      expect(reconstructed.arrays.complex_items).toHaveLength(2);
      expect(reconstructed.arrays.complex_items[0].title).toBe('Elemento 1');
      expect(reconstructed.arrays.complex_items[0].description).toBe('Descripción 1');
      expect(reconstructed.arrays.complex_items[0].priority).toBe(1); // Non-string preserved
      expect(reconstructed.arrays.complex_items[1].title).toBe('Elemento 2');
      expect(reconstructed.arrays.complex_items[1].description).toBe('Descripción 2');
      expect(reconstructed.arrays.complex_items[1].priority).toBe(2);
      
      expect(reconstructed.arrays.mixed_array).toHaveLength(4);
      expect(reconstructed.arrays.mixed_array[0]).toBe('Elemento de cadena');
      expect(reconstructed.arrays.mixed_array[1]).toBe(42); // Non-string preserved
      expect(reconstructed.arrays.mixed_array[2]).toBe(true); // Non-string preserved
      expect(reconstructed.arrays.mixed_array[3].nested).toBe('Valor anidado');
    });

    it('should handle edge cases in nested structures', () => {
      const edgeCaseJson = `{
        "empty_object": {},
        "empty_array": [],
        "null_value": null,
        "nested": {
          "empty_nested": {},
          "array_with_nulls": [null, "valid", null],
          "deeply": {
            "nested": {
              "value": "deep value"
            }
          }
        }
      }`;

      const result = handler.parse(edgeCaseJson);
      
      expect(result['null_value']).toBe(null);
      expect(result['nested.array_with_nulls[0]']).toBe(null);
      expect(result['nested.array_with_nulls[1]']).toBe('valid');
      expect(result['nested.array_with_nulls[2]']).toBe(null);
      expect(result['nested.deeply.nested.value']).toBe('deep value');
      
      // Serialize and verify structure is maintained
      const serialized = handler.serialize(result);
      const parsed = JSON.parse(serialized);
      
      expect(parsed.empty_object).toEqual({});
      expect(parsed.empty_array).toEqual([]);
      expect(parsed.null_value).toBe(null);
      expect(parsed.nested.empty_nested).toEqual({});
      expect(parsed.nested.array_with_nulls).toEqual([null, 'valid', null]);
      expect(parsed.nested.deeply.nested.value).toBe('deep value');
    });

    it('should preserve formatting options in metadata', () => {
      const result = handler.parse(nestedJsonContent) as EnhancedTranslationFile;
      
      // Test custom indentation
      const serializedWithTabs = handler.serialize(result, { indentation: '\t' });
      expect(serializedWithTabs).toContain('\t"app"');
      
      const serializedWith4Spaces = handler.serialize(result, { indentation: 4 });
      expect(serializedWith4Spaces).toContain('    "app"');
      
      // Test default indentation
      const serializedDefault = handler.serialize(result);
      expect(serializedDefault).toContain('  "app"'); // Default 2 spaces
    });
  });
});