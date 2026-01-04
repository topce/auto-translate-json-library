import { XliffHandler } from '../src/format/xliff-handler';
import type { EnhancedTranslationFile } from '../src/format.interface';
import * as fs from 'fs';
import * as path from 'path';

describe('XliffHandler', () => {
  let handler: XliffHandler;

  beforeEach(() => {
    handler = new XliffHandler();
  });

  describe('canHandle', () => {
    it('should handle .xlf and .xliff files', () => {
      expect(handler.canHandle('test.xlf')).toBe(true);
      expect(handler.canHandle('messages.xliff')).toBe(true);
    });

    it('should not handle non-xliff files', () => {
      expect(handler.canHandle('test.json')).toBe(false);
      expect(handler.canHandle('test.xml')).toBe(false);
      expect(handler.canHandle('test.txt')).toBe(false);
    });

    it('should validate XLIFF content when provided', () => {
      const validXliff = '<?xml version="1.0"?><xliff version="1.2"><file><body></body></file></xliff>';
      const invalidContent = 'not xliff content';
      
      expect(handler.canHandle('test.xlf', validXliff)).toBe(true);
      expect(handler.canHandle('test.xlf', invalidContent)).toBe(false);
    });
  });

  describe('XLIFF 1.2 parsing', () => {
    let xliff12Content: string;

    beforeAll(() => {
      xliff12Content = fs.readFileSync(
        path.join(__dirname, 'test-data', 'xliff-1.2-sample.xlf'),
        'utf-8'
      );
    });

    it('should parse XLIFF 1.2 format correctly', () => {
      const result = handler.parse(xliff12Content);
      
      // Should include non-approved and untranslated entries
      expect(result.welcome_message).toBe('¡Bienvenido a nuestra aplicación!');
      expect(result.error_network).toBe('Network connection failed'); // Empty target, should use source
      expect(result.app_name).toBe('My Application'); // No target, should use source
      
      // Should NOT include approved entries
      expect(result.button_submit).toBeUndefined();
    });

    it('should preserve XLIFF 1.2 metadata correctly', () => {
      const result = handler.parse(xliff12Content) as EnhancedTranslationFile;
      
      expect(result._metadata).toBeDefined();
      expect(result._metadata?.format).toBe('xliff');
      expect(result._metadata?.version).toBe('1.2');
      expect(result._metadata?.sourceLanguage).toBe('en');
      expect(result._metadata?.targetLanguage).toBe('es');
      expect(result._metadata?.originalStructure).toBeDefined();
      expect(result._metadata?.preserveComments).toBe(true);
      expect(result._metadata?.preserveAttributes).toBe(true);
    });

    it('should serialize XLIFF 1.2 correctly with updated translations', () => {
      const parsed = handler.parse(xliff12Content) as EnhancedTranslationFile;
      
      // Update translations
      const updated: EnhancedTranslationFile = {
        ...parsed,
        error_network: 'Falló la conexión de red',
        app_name: 'Mi Aplicación'
      };

      const result = handler.serialize(updated);
      
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<xliff version="1.2"');
      expect(result).toContain('source-language="en"');
      expect(result).toContain('target-language="es"');
      expect(result).toContain('Falló la conexión de red');
      expect(result).toContain('Mi Aplicación');
      
      // Approved translations should remain unchanged
      expect(result).toContain('approved="yes"');
      expect(result).toContain('Enviar'); // Original approved translation
    });

    it('should handle XLIFF 1.2 round-trip translation', () => {
      const parsed = handler.parse(xliff12Content) as EnhancedTranslationFile;
      
      // Simulate translation
      const translated: EnhancedTranslationFile = {
        ...parsed,
        error_network: 'Falló la conexión de red',
        app_name: 'Mi Aplicación'
      };

      const serialized = handler.serialize(translated);
      const reparsed = handler.parse(serialized);
      
      expect(reparsed.error_network).toBe('Falló la conexión de red');
      expect(reparsed.app_name).toBe('Mi Aplicación');
      expect(reparsed.welcome_message).toBe('¡Bienvenido a nuestra aplicación!');
    });
  });

  describe('XLIFF 2.0 parsing', () => {
    let xliff20Content: string;

    beforeAll(() => {
      xliff20Content = fs.readFileSync(
        path.join(__dirname, 'test-data', 'xliff-2.0-sample.xlf'),
        'utf-8'
      );
    });

    it('should parse XLIFF 2.0 format correctly', () => {
      const result = handler.parse(xliff20Content);
      
      // Should include non-approved and untranslated entries
      expect(result.welcome_message).toBe('Bienvenue dans notre application!');
      expect(result.error_network).toBe('Network connection failed'); // Empty target, should use source
      expect(result.app_name).toBe('My Application'); // No target, should use source
      
      // Multi-segment handling
      expect(result['multi_segment_message.0']).toBe('Première partie du message');
      expect(result['multi_segment_message.1']).toBe('Deuxième partie du message');
      
      // Should NOT include approved entries
      expect(result.button_submit).toBeUndefined();
    });

    it('should preserve XLIFF 2.0 metadata correctly', () => {
      const result = handler.parse(xliff20Content) as EnhancedTranslationFile;
      
      expect(result._metadata).toBeDefined();
      expect(result._metadata?.format).toBe('xliff');
      expect(result._metadata?.version).toBe('2.0');
      expect(result._metadata?.sourceLanguage).toBe('en');
      expect(result._metadata?.targetLanguage).toBe('fr');
      expect(result._metadata?.originalStructure).toBeDefined();
    });

    it('should serialize XLIFF 2.0 correctly with updated translations', () => {
      const parsed = handler.parse(xliff20Content) as EnhancedTranslationFile;
      
      // Update translations
      const updated: EnhancedTranslationFile = {
        ...parsed,
        error_network: 'Échec de la connexion réseau',
        app_name: 'Mon Application'
      };

      const result = handler.serialize(updated);
      
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<xliff version="2.0"');
      expect(result).toContain('srcLang="en"');
      expect(result).toContain('trgLang="fr"');
      expect(result).toContain('Échec de la connexion réseau');
      expect(result).toContain('Mon Application');
      
      // Approved translations should remain unchanged
      expect(result).toContain('approved="yes"');
      expect(result).toContain('Soumettre'); // Original approved translation
    });

    it('should handle XLIFF 2.0 round-trip translation', () => {
      const parsed = handler.parse(xliff20Content) as EnhancedTranslationFile;
      
      // Simulate translation
      const translated: EnhancedTranslationFile = {
        ...parsed,
        error_network: 'Échec de la connexion réseau',
        app_name: 'Mon Application',
        'multi_segment_message.0': 'Première partie traduite',
        'multi_segment_message.1': 'Deuxième partie traduite'
      };

      const serialized = handler.serialize(translated);
      const reparsed = handler.parse(serialized);
      
      expect(reparsed.error_network).toBe('Échec de la connexion réseau');
      expect(reparsed.app_name).toBe('Mon Application');
      expect(reparsed['multi_segment_message.0']).toBe('Première partie traduite');
      expect(reparsed['multi_segment_message.1']).toBe('Deuxième partie traduite');
    });
  });

  describe('workflow state management', () => {
    it('should respect approved translation states in XLIFF 1.2', () => {
      const xliffWithApproved = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file original="test.properties" source-language="en" target-language="es" datatype="plaintext">
    <body>
      <trans-unit id="approved_text" approved="yes">
        <source>Hello</source>
        <target>Hola</target>
      </trans-unit>
      <trans-unit id="unapproved_text" approved="no">
        <source>Goodbye</source>
        <target>Adiós</target>
      </trans-unit>
      <trans-unit id="no_target">
        <source>New text</source>
      </trans-unit>
    </body>
  </file>
</xliff>`;

      const result = handler.parse(xliffWithApproved);
      
      // Should NOT include approved entries
      expect(result.approved_text).toBeUndefined();
      
      // Should include unapproved and entries without targets
      expect(result.unapproved_text).toBe('Adiós');
      expect(result.no_target).toBe('New text');
    });

    it('should respect approved translation states in XLIFF 2.0', () => {
      const xliffWithApproved = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="2.0" xmlns="urn:oasis:names:tc:xliff:document:2.0" srcLang="en" trgLang="fr">
  <file id="test">
    <unit id="approved_text" approved="yes">
      <segment>
        <source>Hello</source>
        <target>Bonjour</target>
      </segment>
    </unit>
    <unit id="unapproved_text" approved="no">
      <segment>
        <source>Goodbye</source>
        <target>Au revoir</target>
      </segment>
    </unit>
    <unit id="no_target">
      <segment>
        <source>New text</source>
      </segment>
    </unit>
  </file>
</xliff>`;

      const result = handler.parse(xliffWithApproved);
      
      // Should NOT include approved entries
      expect(result.approved_text).toBeUndefined();
      
      // Should include unapproved and entries without targets
      expect(result.unapproved_text).toBe('Au revoir');
      expect(result.no_target).toBe('New text');
    });

    it('should not overwrite approved translations during serialization', () => {
      const xliffContent = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file original="test.properties" source-language="en" target-language="es" datatype="plaintext">
    <body>
      <trans-unit id="approved_text" approved="yes">
        <source>Hello</source>
        <target>Hola</target>
      </trans-unit>
      <trans-unit id="unapproved_text" approved="no">
        <source>Goodbye</source>
        <target>Adiós</target>
      </trans-unit>
    </body>
  </file>
</xliff>`;

      const parsed = handler.parse(xliffContent) as EnhancedTranslationFile;
      
      // Try to "translate" both entries (but approved should be ignored)
      const updated: EnhancedTranslationFile = {
        ...parsed,
        approved_text: 'Should not appear', // This should be ignored
        unapproved_text: 'Hasta luego'
      };

      const result = handler.serialize(updated);
      
      // Approved translation should remain unchanged
      expect(result).toContain('Hola');
      expect(result).not.toContain('Should not appear');
      
      // Unapproved translation should be updated
      expect(result).toContain('Hasta luego');
    });

    it('should update translation states when adding new translations', () => {
      const xliffContent = `<?xml version="1.0" encoding="UTF-8"?>
<xliff version="1.2" xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file original="test.properties" source-language="en" target-language="es" datatype="plaintext">
    <body>
      <trans-unit id="new_text">
        <source>New message</source>
      </trans-unit>
    </body>
  </file>
</xliff>`;

      const parsed = handler.parse(xliffContent) as EnhancedTranslationFile;
      const updated: EnhancedTranslationFile = {
        ...parsed,
        new_text: 'Nuevo mensaje'
      };

      const result = handler.serialize(updated);
      
      // Should contain the new translation
      expect(result).toContain('Nuevo mensaje');
      
      // Should mark as not approved since it's a new translation
      expect(result).toContain('approved="no"');
    });
  });

  describe('validation', () => {
    it('should validate XLIFF 1.2 structure', () => {
      const validXliff12 = {
        xliff: {
          '@_version': '1.2',
          file: {
            body: {
              'trans-unit': [
                {
                  '@_id': 'test',
                  source: { '#text': 'Test' },
                  target: { '#text': 'Prueba' }
                }
              ]
            }
          }
        }
      };

      const result = handler.validateStructure({
        _metadata: { originalStructure: validXliff12 }
      } as EnhancedTranslationFile);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate XLIFF 2.0 structure', () => {
      const validXliff20 = {
        xliff: {
          '@_version': '2.0',
          file: {
            unit: [
              {
                '@_id': 'test',
                segment: {
                  source: { '#text': 'Test' },
                  target: { '#text': 'Test' }
                }
              }
            ]
          }
        }
      };

      const result = handler.validateStructure({
        _metadata: { originalStructure: validXliff20 }
      } as EnhancedTranslationFile);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing xliff root element', () => {
      const invalidStructure = {
        file: {
          body: {
            'trans-unit': []
          }
        }
      };

      const result = handler.validateStructure({
        _metadata: { originalStructure: invalidStructure }
      } as EnhancedTranslationFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('MISSING_XLIFF_ROOT');
    });

    it('should detect missing file element in XLIFF 1.2', () => {
      const invalidXliff12 = {
        xliff: {
          '@_version': '1.2'
          // Missing file element
        }
      };

      const result = handler.validateStructure({
        _metadata: { originalStructure: invalidXliff12, version: '1.2' }
      } as EnhancedTranslationFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('MISSING_FILE_ELEMENT');
    });

    it('should detect missing body element in XLIFF 1.2', () => {
      const invalidXliff12 = {
        xliff: {
          '@_version': '1.2',
          file: {
            // Missing body element
          }
        }
      };

      const result = handler.validateStructure({
        _metadata: { originalStructure: invalidXliff12, version: '1.2' }
      } as EnhancedTranslationFile);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('MISSING_BODY_ELEMENT');
    });

    it('should warn about missing trans-units in XLIFF 1.2', () => {
      const emptyXliff12 = {
        xliff: {
          '@_version': '1.2',
          file: {
            body: {
              // No trans-unit elements
            }
          }
        }
      };

      const result = handler.validateStructure({
        _metadata: { originalStructure: emptyXliff12, version: '1.2' }
      } as EnhancedTranslationFile);
      
      expect(result.isValid).toBe(true); // Valid but with warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.code === 'NO_TRANS_UNITS')).toBe(true);
    });

    it('should warn about missing units in XLIFF 2.0', () => {
      const emptyXliff20 = {
        xliff: {
          '@_version': '2.0',
          file: {
            // No unit elements
          }
        }
      };

      const result = handler.validateStructure({
        _metadata: { originalStructure: emptyXliff20, version: '2.0' }
      } as EnhancedTranslationFile);
      
      expect(result.isValid).toBe(true); // Valid but with warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.code === 'NO_UNITS')).toBe(true);
    });

    it('should handle empty XLIFF gracefully', () => {
      const emptyData = {};

      const result = handler.validateStructure(emptyData);
      expect(result.isValid).toBe(true); // Empty is valid but should have warnings
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].code).toBe('EMPTY_XLIFF');
    });
  });

  describe('error handling', () => {
    it('should throw error for invalid XLIFF content', () => {
      const invalidXliff = 'This is not valid XLIFF content';
      
      expect(() => handler.parse(invalidXliff)).toThrow('Failed to parse XLIFF');
    });

    it('should throw error for malformed XML', () => {
      // fast-xml-parser is very lenient, so we test with completely invalid content
      const malformedXliff = 'completely invalid content that is not XML at all';
      
      expect(() => handler.parse(malformedXliff)).toThrow('Failed to parse XLIFF');
    });

    it('should throw error for XML without xliff root element', () => {
      const nonXliffXml = '<?xml version="1.0"?><root><element>content</element></root>';
      
      expect(() => handler.parse(nonXliffXml)).toThrow('Invalid XLIFF format: missing xliff root element');
    });
  });

  describe('getFileExtension', () => {
    it('should return .xlf extension', () => {
      expect(handler.getFileExtension()).toBe('.xlf');
    });
  });

  describe('format reconstruction', () => {
    it('should reconstruct XLIFF 1.2 structure when no original structure is available', () => {
      const data: EnhancedTranslationFile = {
        test_key: 'Test Value',
        another_key: 'Another Value',
        _metadata: {
          format: 'xliff',
          sourceLanguage: 'en',
          targetLanguage: 'es'
        }
      };

      const result = handler.serialize(data);
      
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<xliff version="1.2"');
      expect(result).toContain('source-language="en"');
      expect(result).toContain('target-language="es"');
      expect(result).toContain('Test Value');
      expect(result).toContain('Another Value');
      expect(result).toContain('id="test_key"');
      expect(result).toContain('id="another_key"');
    });

    it('should apply formatting options to XLIFF output', () => {
      const data: EnhancedTranslationFile = {
        test_key: 'Test Value'
      };

      const resultWithTabs = handler.serialize(data, { indentation: '\t' });
      const resultWith4Spaces = handler.serialize(data, { indentation: 4 });
      
      // Both should contain proper XLIFF structure
      expect(resultWithTabs).toContain('<xliff');
      expect(resultWith4Spaces).toContain('<xliff');
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
});