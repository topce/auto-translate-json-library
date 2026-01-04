import { XmlHandler } from '../src/format/xml-handler';
import type { EnhancedTranslationFile } from '../src/format.interface';
import * as fs from 'fs';
import * as path from 'path';

describe('XmlHandler', () => {
  let handler: XmlHandler;

  beforeEach(() => {
    handler = new XmlHandler();
  });

  describe('canHandle', () => {
    it('should handle .xml files', () => {
      expect(handler.canHandle('test.xml')).toBe(true);
      expect(handler.canHandle('strings.xml')).toBe(true);
    });

    it('should not handle non-xml files', () => {
      expect(handler.canHandle('test.json')).toBe(false);
      expect(handler.canHandle('test.txt')).toBe(false);
    });

    it('should validate XML content when provided', () => {
      expect(handler.canHandle('test.xml', '<?xml version="1.0"?><root></root>')).toBe(true);
      expect(handler.canHandle('test.xml', '<root></root>')).toBe(true);
      expect(handler.canHandle('test.xml', 'not xml content')).toBe(false); // Should be false for invalid XML
    });
  });

  describe('Android strings.xml parsing', () => {
    const androidXml = `<?xml version="1.0" encoding="UTF-8"?>
<resources>
    <string name="app_name">My App</string>
    <string name="welcome_message">Welcome to our application!</string>
    <string name="button_text">Click me</string>
    <!-- This is a comment -->
    <string name="formatted_text"><![CDATA[This is <b>bold</b> text]]></string>
</resources>`;

    it('should parse Android strings.xml format correctly', () => {
      const result = handler.parse(androidXml);
      
      expect(result.app_name).toBe('My App');
      expect(result.welcome_message).toBe('Welcome to our application!');
      expect(result.button_text).toBe('Click me');
      expect(result.formatted_text).toBe('This is <b>bold</b> text');
    });

    it('should preserve metadata for Android format', () => {
      const result = handler.parse(androidXml) as EnhancedTranslationFile;
      
      expect(result._metadata).toBeDefined();
      expect(result._metadata?.format).toBe('android-xml');
      expect(result._metadata?.originalStructure).toBeDefined();
      expect(result._metadata?.preserveComments).toBe(true);
      expect(result._metadata?.preserveAttributes).toBe(true);
    });

    it('should handle Android XML with grouped strings', () => {
      const groupedXml = `<?xml version="1.0" encoding="UTF-8"?>
<resources>
    <string name="app_name">My App</string>
    <group name="errors">
        <string name="network_error">Network connection failed</string>
        <string name="validation_error">Please check your input</string>
    </group>
</resources>`;

      const result = handler.parse(groupedXml);
      
      expect(result.app_name).toBe('My App');
      expect(result.errors).toBeDefined();
      expect(typeof result.errors).toBe('object');
      expect((result.errors as any).network_error).toBe('Network connection failed');
      expect((result.errors as any).validation_error).toBe('Please check your input');
    });

    it('should serialize Android XML correctly', () => {
      const translationData: EnhancedTranslationFile = {
        app_name: 'Mi Aplicación',
        welcome_message: '¡Bienvenido a nuestra aplicación!',
        button_text: 'Haz clic aquí',
        _metadata: {
          format: 'android-xml',
          originalStructure: {
            resources: {
              string: [
                { '@_name': 'app_name', '#text': 'My App' },
                { '@_name': 'welcome_message', '#text': 'Welcome to our application!' },
                { '@_name': 'button_text', '#text': 'Click me' }
              ]
            }
          }
        }
      };

      const result = handler.serialize(translationData);
      
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<resources>');
      expect(result).toContain('name="app_name"');
      expect(result).toContain('Mi Aplicación');
      expect(result).toContain('¡Bienvenido a nuestra aplicación!');
      expect(result).toContain('Haz clic aquí');
    });
  });

  describe('iOS XML parsing', () => {
    const iosXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>app_name</key>
    <string>My iOS App</string>
    <key>welcome_message</key>
    <string>Welcome to iOS!</string>
    <key>settings_title</key>
    <string>Settings</string>
</dict>
</plist>`;

    it('should parse iOS plist XML format correctly', () => {
      const result = handler.parse(iosXml);
      
      expect(result.app_name).toBe('My iOS App');
      expect(result.welcome_message).toBe('Welcome to iOS!');
      expect(result.settings_title).toBe('Settings');
    });

    it('should preserve metadata for iOS format', () => {
      const result = handler.parse(iosXml) as EnhancedTranslationFile;
      
      expect(result._metadata).toBeDefined();
      expect(result._metadata?.format).toBe('ios-xml');
      expect(result._metadata?.originalStructure).toBeDefined();
    });

    it('should serialize iOS XML correctly', () => {
      const translationData: EnhancedTranslationFile = {
        app_name: 'Mi App iOS',
        welcome_message: '¡Bienvenido a iOS!',
        _metadata: {
          format: 'ios-xml',
          originalStructure: {
            plist: {
              '@_version': '1.0',
              dict: {
                key: [
                  { '#text': 'app_name' },
                  { '#text': 'welcome_message' }
                ],
                string: [
                  { '#text': 'My iOS App' },
                  { '#text': 'Welcome to iOS!' }
                ]
              }
            }
          }
        }
      };

      const result = handler.serialize(translationData);
      
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<plist');
      expect(result).toContain('<dict>');
      expect(result).toContain('Mi App iOS');
      expect(result).toContain('¡Bienvenido a iOS!');
    });
  });

  describe('Generic XML parsing', () => {
    const genericXml = `<?xml version="1.0" encoding="UTF-8"?>
<translations>
    <messages>
        <greeting>Hello World</greeting>
        <farewell>Goodbye</farewell>
    </messages>
    <labels>
        <submit>Submit</submit>
        <cancel>Cancel</cancel>
    </labels>
</translations>`;

    it('should parse generic XML format correctly', () => {
      const result = handler.parse(genericXml);
      
      expect(result['messages.greeting']).toBe('Hello World');
      expect(result['messages.farewell']).toBe('Goodbye');
      expect(result['labels.submit']).toBe('Submit');
      expect(result['labels.cancel']).toBe('Cancel');
    });

    it('should preserve metadata for generic format', () => {
      const result = handler.parse(genericXml) as EnhancedTranslationFile;
      
      expect(result._metadata).toBeDefined();
      expect(result._metadata?.format).toBe('generic-xml');
      expect(result._metadata?.originalStructure).toBeDefined();
    });
  });

  describe('validation', () => {
    it('should validate Android XML structure', () => {
      const validData = {
        resources: {
          string: [
            { '@_name': 'test', '#text': 'Test Value' }
          ]
        }
      };

      const result = handler.validateStructure(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid Android XML structure', () => {
      const invalidData = {
        // Missing resources element
        string: [{ '@_name': 'test', '#text': 'Test Value' }]
      };

      const result = handler.validateStructure(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('MISSING_RESOURCES');
    });

    it('should validate iOS XML structure', () => {
      const validData = {
        plist: {
          dict: {
            key: [{ '#text': 'test_key' }],
            string: [{ '#text': 'Test Value' }]
          }
        }
      };

      const result = handler.validateStructure(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid iOS XML structure', () => {
      const invalidData = {
        // Missing plist element
        dict: {
          key: [{ '#text': 'test_key' }]
        }
      };

      const result = handler.validateStructure(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('MISSING_PLIST');
    });

    it('should handle empty XML gracefully', () => {
      const emptyData = {};

      const result = handler.validateStructure(emptyData);
      expect(result.isValid).toBe(true); // Empty is valid but should have warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].code).toBe('EMPTY_XML');
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid XML content', () => {
      const invalidXml = 'This is not valid XML content';
      
      expect(() => handler.parse(invalidXml)).toThrow('Failed to parse XML');
    });

    it('should throw error for malformed XML', () => {
      const malformedXml = '<?xml version="1.0"?><root><unclosed>';
      
      expect(() => handler.parse(malformedXml)).toThrow('Failed to parse XML');
    });
  });

  describe('getFileExtension', () => {
    it('should return .xml extension', () => {
      expect(handler.getFileExtension()).toBe('.xml');
    });
  });

  describe('enhanced Android strings.xml support', () => {
    let androidXmlContent: string;
    let androidGroupedXmlContent: string;

    beforeAll(() => {
      androidXmlContent = fs.readFileSync(
        path.join(__dirname, 'test-data', 'android-strings.xml'),
        'utf-8'
      );
      androidGroupedXmlContent = fs.readFileSync(
        path.join(__dirname, 'test-data', 'android-grouped-strings.xml'),
        'utf-8'
      );
    });

    it('should parse Android strings.xml with special characters and CDATA', () => {
      const result = handler.parse(androidXmlContent);
      
      expect(result.app_name).toBe('My Android App');
      expect(result.welcome_message).toBe('Welcome to our application!');
      expect(result.button_text).toBe('Click me');
      expect(result.formatted_text).toBe('This is <b>bold</b> text');
      expect(result.empty_string).toBe('');
      expect(result.special_chars).toBe('Special chars: & < > " \'');
    });

    it('should preserve Android XML metadata correctly', () => {
      const result = handler.parse(androidXmlContent) as EnhancedTranslationFile;
      
      expect(result._metadata).toBeDefined();
      expect(result._metadata?.format).toBe('android-xml');
      expect(result._metadata?.originalStructure).toBeDefined();
      expect(result._metadata?.preserveComments).toBe(true);
      expect(result._metadata?.preserveAttributes).toBe(true);
      
      // Verify original structure contains resources
      const original = result._metadata?.originalStructure;
      expect(original.resources).toBeDefined();
      expect(original.resources.string).toBeDefined();
    });

    it('should handle Android XML with grouped strings correctly', () => {
      const result = handler.parse(androidGroupedXmlContent);
      
      expect(result.app_name).toBe('My Android App');
      expect(result.errors).toBeDefined();
      expect(typeof result.errors).toBe('object');
      
      const errors = result.errors as any;
      expect(errors.network_error).toBe('Network connection failed');
      expect(errors.validation_error).toBe('Please check your input');
      expect(errors.server_error).toBe('Server is temporarily unavailable');
      
      const buttons = result.buttons as any;
      expect(buttons.submit).toBe('Submit');
      expect(buttons.cancel).toBe('Cancel');
      expect(buttons.retry).toBe('Retry');
    });

    it('should serialize Android XML correctly with proper structure', () => {
      const translationData: EnhancedTranslationFile = {
        app_name: 'Mi Aplicación Android',
        welcome_message: '¡Bienvenido a nuestra aplicación!',
        button_text: 'Haz clic aquí',
        formatted_text: 'Este es texto <b>negrita</b>',
        empty_string: '',
        special_chars: 'Caracteres especiales: & < > " \'',
        _metadata: {
          format: 'android-xml',
          originalStructure: {
            resources: {
              string: [
                { '@_name': 'app_name', '#text': 'My Android App' },
                { '@_name': 'welcome_message', '#text': 'Welcome to our application!' },
                { '@_name': 'button_text', '#text': 'Click me' },
                { '@_name': 'formatted_text', '#text': 'This is <b>bold</b> text' },
                { '@_name': 'empty_string', '#text': '' },
                { '@_name': 'special_chars', '#text': 'Special chars: & < > " \'' }
              ]
            }
          }
        }
      };

      const result = handler.serialize(translationData);
      
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<resources>');
      expect(result).toContain('name="app_name"');
      expect(result).toContain('Mi Aplicación Android');
      expect(result).toContain('¡Bienvenido a nuestra aplicación!');
      expect(result).toContain('Haz clic aquí');
      expect(result).toContain('Este es texto &lt;b&gt;negrita&lt;/b&gt;');
      expect(result).toContain('Caracteres especiales: &amp; &lt; &gt; &quot; &apos;');
      expect(result).toContain('</resources>');
    });

    it('should handle round-trip translation for Android XML', () => {
      const parsed = handler.parse(androidXmlContent) as EnhancedTranslationFile;
      
      // Simulate translation
      const translated: EnhancedTranslationFile = {
        ...parsed,
        app_name: 'Mi Aplicación Android',
        welcome_message: '¡Bienvenido a nuestra aplicación!',
        button_text: 'Haz clic aquí',
        formatted_text: 'Este es texto <b>negrita</b>',
        special_chars: 'Caracteres especiales: & < > " \''
      };

      const serialized = handler.serialize(translated);
      const reparsed = handler.parse(serialized);
      
      expect(reparsed.app_name).toBe('Mi Aplicación Android');
      expect(reparsed.welcome_message).toBe('¡Bienvenido a nuestra aplicación!');
      expect(reparsed.button_text).toBe('Haz clic aquí');
      expect(reparsed.formatted_text).toBe('Este es texto <b>negrita</b>');
      expect(reparsed.special_chars).toBe('Caracteres especiales: & < > " \'');
    });

    it('should validate Android XML structure correctly', () => {
      const validAndroidStructure = {
        resources: {
          string: [
            { '@_name': 'test_key', '#text': 'Test Value' },
            { '@_name': 'another_key', '#text': 'Another Value' }
          ]
        }
      };

      const result = handler.validateStructure(validAndroidStructure);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid Android XML structure', () => {
      const invalidAndroidStructure = {
        // Missing resources root element
        string: [{ '@_name': 'test', '#text': 'Test Value' }]
      };

      const result = handler.validateStructure(invalidAndroidStructure);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('MISSING_RESOURCES');
    });
  });

  describe('enhanced iOS XML support', () => {
    let iosXmlContent: string;

    beforeAll(() => {
      iosXmlContent = fs.readFileSync(
        path.join(__dirname, 'test-data', 'ios-strings.xml'),
        'utf-8'
      );
    });

    it('should parse iOS plist XML format correctly', () => {
      const result = handler.parse(iosXmlContent);
      
      expect(result.app_name).toBe('My iOS App');
      expect(result.welcome_message).toBe('Welcome to iOS!');
      expect(result.settings_title).toBe('Settings');
      expect(result.empty_value).toBe('');
      expect(result.special_chars).toBe('Special: & < >');
    });

    it('should preserve iOS XML metadata correctly', () => {
      const result = handler.parse(iosXmlContent) as EnhancedTranslationFile;
      
      expect(result._metadata).toBeDefined();
      expect(result._metadata?.format).toBe('ios-xml');
      expect(result._metadata?.originalStructure).toBeDefined();
      expect(result._metadata?.preserveComments).toBe(true);
      expect(result._metadata?.preserveAttributes).toBe(true);
      
      // Verify original structure contains plist
      const original = result._metadata?.originalStructure;
      expect(original.plist).toBeDefined();
      expect(original.plist.dict).toBeDefined();
    });

    it('should serialize iOS XML correctly with proper plist structure', () => {
      const translationData: EnhancedTranslationFile = {
        app_name: 'Mi App iOS',
        welcome_message: '¡Bienvenido a iOS!',
        settings_title: 'Configuraciones',
        empty_value: '',
        special_chars: 'Especial: & < >',
        _metadata: {
          format: 'ios-xml',
          originalStructure: {
            plist: {
              '@_version': '1.0',
              dict: {
                key: [
                  { '#text': 'app_name' },
                  { '#text': 'welcome_message' },
                  { '#text': 'settings_title' },
                  { '#text': 'empty_value' },
                  { '#text': 'special_chars' }
                ],
                string: [
                  { '#text': 'My iOS App' },
                  { '#text': 'Welcome to iOS!' },
                  { '#text': 'Settings' },
                  { '#text': '' },
                  { '#text': 'Special: & < >' }
                ]
              }
            }
          }
        }
      };

      const result = handler.serialize(translationData);
      
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<plist');
      expect(result).toContain('<dict>');
      expect(result).toContain('Mi App iOS');
      expect(result).toContain('¡Bienvenido a iOS!');
      expect(result).toContain('Configuraciones');
      expect(result).toContain('Especial: &amp; &lt; &gt;');
      expect(result).toContain('</dict>');
      expect(result).toContain('</plist>');
    });

    it('should handle round-trip translation for iOS XML', () => {
      const parsed = handler.parse(iosXmlContent) as EnhancedTranslationFile;
      
      // Simulate translation
      const translated: EnhancedTranslationFile = {
        ...parsed,
        app_name: 'Mi App iOS',
        welcome_message: '¡Bienvenido a iOS!',
        settings_title: 'Configuraciones',
        special_chars: 'Especial: & < >'
      };

      const serialized = handler.serialize(translated);
      const reparsed = handler.parse(serialized);
      
      expect(reparsed.app_name).toBe('Mi App iOS');
      expect(reparsed.welcome_message).toBe('¡Bienvenido a iOS!');
      expect(reparsed.settings_title).toBe('Configuraciones');
      expect(reparsed.special_chars).toBe('Especial: & < >');
    });

    it('should validate iOS XML structure correctly', () => {
      const validIosStructure = {
        plist: {
          '@_version': '1.0',
          dict: {
            key: [
              { '#text': 'test_key' },
              { '#text': 'another_key' }
            ],
            string: [
              { '#text': 'Test Value' },
              { '#text': 'Another Value' }
            ]
          }
        }
      };

      const result = handler.validateStructure(validIosStructure);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid iOS XML structure', () => {
      const invalidIosStructure = {
        // Missing plist root element
        dict: {
          key: [{ '#text': 'test_key' }],
          string: [{ '#text': 'Test Value' }]
        }
      };

      const result = handler.validateStructure(invalidIosStructure);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('MISSING_PLIST');
    });

    it('should handle iOS XML with missing dict element', () => {
      const invalidIosStructure = {
        plist: {
          '@_version': '1.0'
          // Missing dict element
        }
      };

      const result = handler.validateStructure(invalidIosStructure);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('MISSING_DICT');
    });
  });

  describe('XML formatting and serialization options', () => {
    it('should apply custom indentation to XML output', () => {
      const data: EnhancedTranslationFile = {
        test_key: 'Test Value',
        another_key: 'Another Value'
      };

      const resultWithTabs = handler.serialize(data, { indentation: '\t' });
      const resultWith4Spaces = handler.serialize(data, { indentation: 4 });
      
      // Both should contain proper XML structure
      expect(resultWithTabs).toContain('<resources>');
      expect(resultWith4Spaces).toContain('<resources>');
      expect(resultWithTabs).toContain('Test Value');
      expect(resultWith4Spaces).toContain('Test Value');
    });

    it('should handle XML declaration option', () => {
      const data: EnhancedTranslationFile = {
        test_key: 'Test Value'
      };

      const resultWithDeclaration = handler.serialize(data, { xmlDeclaration: true });
      const resultWithoutDeclaration = handler.serialize(data, { xmlDeclaration: false });
      
      expect(resultWithDeclaration).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
      expect(resultWithoutDeclaration).not.toMatch(/^<\?xml/);
    });
  });

  describe('XML error handling and edge cases', () => {
    it('should handle malformed XML gracefully', () => {
      const malformedXml = '<?xml version="1.0"?><resources><string name="test">Unclosed tag';
      
      expect(() => handler.parse(malformedXml)).toThrow('Failed to parse XML');
    });

    it('should handle XML with no translatable content', () => {
      const emptyXml = '<?xml version="1.0"?><resources></resources>';
      
      const result = handler.parse(emptyXml);
      const nonMetadataKeys = Object.keys(result).filter(key => !key.startsWith('_'));
      
      // Empty resources should result in no translatable content
      expect(nonMetadataKeys.length).toBe(0);
      
      const validation = handler.validateStructure(result);
      expect(validation.isValid).toBe(true);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings[0].code).toBe('NO_STRINGS');
    });

    it('should handle XML with complex nested structures', () => {
      const complexXml = `<?xml version="1.0"?>
        <resources>
          <string name="simple">Simple string</string>
          <group name="nested_group">
            <string name="nested_string">Nested string</string>
            <group name="deeply_nested">
              <string name="deep_string">Deep string</string>
            </group>
          </group>
        </resources>`;
      
      const result = handler.parse(complexXml);
      
      expect(result.simple).toBe('Simple string');
      expect(result.nested_group).toBeDefined();
      expect(typeof result.nested_group).toBe('object');
      
      const nestedGroup = result.nested_group as any;
      expect(nestedGroup.nested_string).toBe('Nested string');
    });

    it('should preserve XML attributes and special elements', () => {
      const xmlWithAttributes = `<?xml version="1.0"?>
        <resources xmlns:android="http://schemas.android.com/apk/res/android">
          <string name="app_name" translatable="false">My App</string>
          <string name="welcome">Welcome!</string>
        </resources>`;
      
      const result = handler.parse(xmlWithAttributes) as EnhancedTranslationFile;
      
      expect(result.app_name).toBe('My App');
      expect(result.welcome).toBe('Welcome!');
      expect(result._metadata?.originalStructure).toBeDefined();
      expect(result._metadata?.preserveAttributes).toBe(true);
    });
  });
});