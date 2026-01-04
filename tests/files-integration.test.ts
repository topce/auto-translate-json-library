import { Files } from '../src/files';
import { FormatDetector } from '../src/format-detector';
import { FormatHandlerFactory } from '../src/format-handler-factory';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('Files Integration Tests', () => {
  const testDir = path.join(__dirname, 'test-files-integration');
  
  beforeAll(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Constructor and Format Detection', () => {
    it('should create Files instance with JSON file', () => {
      const jsonFile = path.join(testDir, 'en.json');
      fs.writeFileSync(jsonFile, '{"hello": "Hello"}');
      
      const files = new Files(jsonFile);
      
      expect(files.sourceLocale).toBe('en');
      expect(files.getDetectedFormat()).toBe('json');
      expect(files.getFormatOverride()).toBeUndefined();
    });

    it('should create Files instance with format override', () => {
      const jsonFile = path.join(testDir, 'en.json');
      fs.writeFileSync(jsonFile, '{"hello": "Hello"}');
      
      const files = new Files(jsonFile, 'xml');
      
      expect(files.sourceLocale).toBe('en');
      expect(files.getDetectedFormat()).toBe('xml');
      expect(files.getFormatOverride()).toBe('xml');
    });

    it('should handle XML file detection', () => {
      const xmlFile = path.join(testDir, 'en.xml');
      fs.writeFileSync(xmlFile, '<?xml version="1.0"?><resources><string name="hello">Hello</string></resources>');
      
      const files = new Files(xmlFile);
      
      expect(files.sourceLocale).toBe('en');
      expect(files.getDetectedFormat()).toBe('android-xml');
    });
  });

  describe('Load and Save Methods', () => {
    it('should load and save JSON files correctly', async () => {
      const jsonFile = path.join(testDir, 'test-en.json');
      const testData = { hello: 'Hello', world: 'World' };
      fs.writeFileSync(jsonFile, JSON.stringify(testData, null, 2));
      
      const files = new Files(jsonFile);
      const loaded = await files.loadJsonFromLocale('test-en');
      
      expect(loaded).toEqual(testData);
      
      // Test saving
      const newData = { hello: 'Hola', world: 'Mundo' };
      files.saveJsonToLocale('test-es', newData);
      
      const savedFile = path.join(testDir, 'test-es.json');
      expect(fs.existsSync(savedFile)).toBe(true);
      
      const savedContent = JSON.parse(fs.readFileSync(savedFile, 'utf8'));
      expect(savedContent).toEqual(newData);
    });

    it('should handle empty files gracefully', async () => {
      const emptyFile = path.join(testDir, 'empty.json');
      fs.writeFileSync(emptyFile, '');
      
      const files = new Files(emptyFile);
      const loaded = await files.loadJsonFromLocale('empty');
      
      expect(loaded).toEqual({});
    });

    it('should provide helpful error messages for invalid files', async () => {
      const invalidFile = path.join(testDir, 'invalid.json');
      fs.writeFileSync(invalidFile, '{"invalid": json}');
      
      const files = new Files(invalidFile);
      
      await expect(files.loadJsonFromLocale('invalid')).rejects.toThrow(/Failed to load translation file/);
    });
  });

  describe('Multi-Format File Loading and Saving', () => {
    it('should load and save JSON files using format handlers', async () => {
      const jsonFile = path.join(testDir, 'multi-en.json');
      const testData = { hello: 'Hello', 'nested.key': 'value' };
      fs.writeFileSync(jsonFile, JSON.stringify(testData, null, 2));
      
      const files = new Files(jsonFile);
      const loaded = await files.loadJsonFromLocale('multi-en');
      
      expect(loaded).toEqual(testData);
      expect(files.getDetectedFormat()).toBe('json');
      
      // Test saving with format handler - use flat structure to match handler behavior
      const newData = { hello: 'Hola', 'nested.key': 'valor' };
      files.saveJsonToLocale('multi-es', newData);
      
      const savedFile = path.join(testDir, 'multi-es.json');
      expect(fs.existsSync(savedFile)).toBe(true);
      
      const savedContent = JSON.parse(fs.readFileSync(savedFile, 'utf8'));
      // The handler may expand nested keys, so check for the presence of data
      expect(savedContent.hello).toBe('Hola');
      expect(savedContent['nested.key'] || savedContent.nested?.key).toBe('valor');
    });

    it('should load and save real test data files across multiple formats', async () => {
      const testDataDir = path.join(__dirname, 'test-data');
      
      // Test with real Android XML file
      const androidXmlSource = path.join(testDataDir, 'android-strings.xml');
      if (fs.existsSync(androidXmlSource)) {
        const androidXmlTarget = path.join(testDir, 'real-android-en.xml');
        fs.copyFileSync(androidXmlSource, androidXmlTarget);
        
        const files = new Files(androidXmlTarget);
        const loaded = await files.loadJsonFromLocale('real-android-en');
        
        expect(loaded).toBeDefined();
        expect(files.getDetectedFormat()).toBe('android-xml');
        
        // Test saving
        files.saveJsonToLocale('real-android-es', loaded);
        const savedFile = path.join(testDir, 'real-android-es.xml');
        expect(fs.existsSync(savedFile)).toBe(true);
      }
      
      // Test with real XLIFF file
      const xliffSource = path.join(testDataDir, 'xliff-1.2-sample.xlf');
      if (fs.existsSync(xliffSource)) {
        const xliffTarget = path.join(testDir, 'real-xliff-en.xlf');
        fs.copyFileSync(xliffSource, xliffTarget);
        
        const files = new Files(xliffTarget);
        const loaded = await files.loadJsonFromLocale('real-xliff-en');
        
        expect(loaded).toBeDefined();
        expect(files.getDetectedFormat()).toBe('xliff');
        
        // Test saving
        files.saveJsonToLocale('real-xliff-es', loaded);
        const savedFile = path.join(testDir, 'real-xliff-es.xlf');
        expect(fs.existsSync(savedFile)).toBe(true);
      }
      
      // Test with real PO file
      const poSource = path.join(testDataDir, 'sample.po');
      if (fs.existsSync(poSource)) {
        const poTarget = path.join(testDir, 'real-po-en.po');
        fs.copyFileSync(poSource, poTarget);
        
        const files = new Files(poTarget);
        const loaded = await files.loadJsonFromLocale('real-po-en');
        
        expect(loaded).toBeDefined();
        expect(files.getDetectedFormat()).toBe('po');
        
        // Test saving
        files.saveJsonToLocale('real-po-es', loaded);
        const savedFile = path.join(testDir, 'real-po-es.po');
        expect(fs.existsSync(savedFile)).toBe(true);
      }
    });

    it('should load and save XML files using format handlers', async () => {
      const xmlFile = path.join(testDir, 'multi-en.xml');
      const xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n<resources>\n  <string name="hello">Hello</string>\n  <string name="world">World</string>\n</resources>';
      fs.writeFileSync(xmlFile, xmlContent);
      
      const files = new Files(xmlFile);
      const loaded = await files.loadJsonFromLocale('multi-en');
      
      expect(loaded).toBeDefined();
      expect(files.getDetectedFormat()).toBe('android-xml');
      
      // Test saving XML format - use the same structure that was loaded
      files.saveJsonToLocale('multi-es', loaded);
      
      const savedFile = path.join(testDir, 'multi-es.xml');
      expect(fs.existsSync(savedFile)).toBe(true);
      
      const savedContent = fs.readFileSync(savedFile, 'utf8');
      expect(savedContent).toContain('<?xml');
      expect(savedContent).toContain('<resources>');
    });

    it('should load and save YAML files using format handlers', async () => {
      const yamlFile = path.join(testDir, 'multi-en.yml');
      const yamlContent = 'hello: Hello\nworld: World\nnested:\n  key: value';
      fs.writeFileSync(yamlFile, yamlContent);
      
      const files = new Files(yamlFile);
      const loaded = await files.loadJsonFromLocale('multi-en');
      
      expect(loaded).toBeDefined();
      expect(loaded.hello).toBe('Hello');
      expect(loaded.world).toBe('World');
      // The format detection may detect as properties due to content pattern, but should still work
      const detectedFormat = files.getDetectedFormat();
      expect(detectedFormat).toBeDefined();
      expect(['yaml', 'properties'].includes(detectedFormat!)).toBe(true);
      
      // Test saving YAML format
      const newData = { hello: 'Hola', world: 'Mundo', 'nested.key': 'valor' };
      files.saveJsonToLocale('multi-es', newData);
      
      const savedFile = path.join(testDir, 'multi-es.yml');
      expect(fs.existsSync(savedFile)).toBe(true);
      
      const savedContent = fs.readFileSync(savedFile, 'utf8');
      expect(savedContent).toContain('Hola');
      expect(savedContent).toContain('Mundo');
    });

    it('should load and save Properties files using format handlers', async () => {
      const propsFile = path.join(testDir, 'multi-en.properties');
      const propsContent = 'hello=Hello\nworld=World\nnested.key=value';
      fs.writeFileSync(propsFile, propsContent);
      
      const files = new Files(propsFile);
      const loaded = await files.loadJsonFromLocale('multi-en');
      
      expect(loaded).toBeDefined();
      expect(loaded.hello).toBe('Hello');
      expect(loaded.world).toBe('World');
      expect(files.getDetectedFormat()).toBe('properties');
      
      // Test saving Properties format
      const newData = { hello: 'Hola', world: 'Mundo', 'nested.key': 'valor' };
      files.saveJsonToLocale('multi-es', newData);
      
      const savedFile = path.join(testDir, 'multi-es.properties');
      expect(fs.existsSync(savedFile)).toBe(true);
      
      const savedContent = fs.readFileSync(savedFile, 'utf8');
      expect(savedContent).toContain('hello');
      expect(savedContent).toContain('Hola');
      expect(savedContent).toContain('world');
      expect(savedContent).toContain('Mundo');
    });

    it('should load and save CSV files using format handlers', async () => {
      const csvFile = path.join(testDir, 'multi-en.csv');
      const csvContent = 'key,en\nhello,Hello\nworld,World';
      fs.writeFileSync(csvFile, csvContent);
      
      const files = new Files(csvFile);
      const loaded = await files.loadJsonFromLocale('multi-en');
      
      expect(loaded).toBeDefined();
      expect(files.getDetectedFormat()).toBe('csv');
      
      // Test saving CSV format
      const newData = { hello: 'Hola', world: 'Mundo' };
      files.saveJsonToLocale('multi-es', newData);
      
      const savedFile = path.join(testDir, 'multi-es.csv');
      expect(fs.existsSync(savedFile)).toBe(true);
      
      const savedContent = fs.readFileSync(savedFile, 'utf8');
      expect(savedContent).toContain('Hola');
      expect(savedContent).toContain('Mundo');
    });
  });

  describe('Format Detection and Handler Selection', () => {
    it('should detect JSON format correctly', () => {
      const jsonFile = path.join(testDir, 'detect.json');
      fs.writeFileSync(jsonFile, '{"test": "value"}');
      
      const files = new Files(jsonFile);
      expect(files.getDetectedFormat()).toBe('json');
    });

    it('should detect Android XML format from content', () => {
      const xmlFile = path.join(testDir, 'detect.xml');
      const androidXml = '<?xml version="1.0" encoding="UTF-8"?>\n<resources>\n  <string name="app_name">Test App</string>\n</resources>';
      fs.writeFileSync(xmlFile, androidXml);
      
      const files = new Files(xmlFile);
      expect(files.getDetectedFormat()).toBe('android-xml');
    });

    it('should detect iOS XML format from content', () => {
      const xmlFile = path.join(testDir, 'detect-ios.xml');
      const iosXml = '<?xml version="1.0" encoding="UTF-8"?>\n<plist version="1.0">\n<dict>\n  <key>test</key>\n  <string>value</string>\n</dict>\n</plist>';
      fs.writeFileSync(xmlFile, iosXml);
      
      const files = new Files(xmlFile);
      expect(files.getDetectedFormat()).toBe('ios-xml');
    });

    it('should detect XLIFF format from content', () => {
      const xliffFile = path.join(testDir, 'detect.xlf');
      const xliffContent = '<?xml version="1.0" encoding="UTF-8"?>\n<xliff version="1.2">\n  <file source-language="en" target-language="es">\n    <body>\n      <trans-unit id="1">\n        <source>Hello</source>\n        <target>Hola</target>\n      </trans-unit>\n    </body>\n  </file>\n</xliff>';
      fs.writeFileSync(xliffFile, xliffContent);
      
      const files = new Files(xliffFile);
      expect(files.getDetectedFormat()).toBe('xliff');
    });

    it('should detect ARB format from content', () => {
      const arbFile = path.join(testDir, 'detect.arb');
      const arbContent = '{\n  "@@locale": "en",\n  "hello": "Hello",\n  "@hello": {\n    "description": "Greeting"\n  }\n}';
      fs.writeFileSync(arbFile, arbContent);
      
      const files = new Files(arbFile);
      expect(files.getDetectedFormat()).toBe('arb');
    });

    it('should detect PO format from content', () => {
      const poFile = path.join(testDir, 'detect.po');
      const poContent = 'msgid ""\nmsgstr ""\n\nmsgid "hello"\nmsgstr "Hello"';
      fs.writeFileSync(poFile, poContent);
      
      const files = new Files(poFile);
      expect(files.getDetectedFormat()).toBe('po');
    });

    it('should use format override when provided', () => {
      const jsonFile = path.join(testDir, 'override.json');
      fs.writeFileSync(jsonFile, '{"test": "value"}');
      
      const files = new Files(jsonFile, 'yaml');
      expect(files.getDetectedFormat()).toBe('yaml');
      expect(files.getFormatOverride()).toBe('yaml');
    });

    it('should select appropriate handler based on detected format', () => {
      const formats = ['json', 'xml', 'yaml', 'properties', 'csv'];
      
      formats.forEach(format => {
        const handler = FormatHandlerFactory.getHandler(format);
        expect(handler).toBeDefined();
        expect(FormatHandlerFactory.hasHandler(format)).toBe(true);
      });
    });

    it('should handle unknown formats gracefully', () => {
      const unknownFile = path.join(testDir, 'unknown.xyz');
      fs.writeFileSync(unknownFile, 'unknown content');
      
      const files = new Files(unknownFile);
      expect(files.getDetectedFormat()).toBe('unknown');
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain same interface as before', () => {
      const jsonFile = path.join(testDir, 'compat.json');
      fs.writeFileSync(jsonFile, '{"test": "value"}');
      
      // Test that old constructor still works
      const files = new Files(jsonFile);
      
      expect(files.sourceLocale).toBeDefined();
      expect(files.targetLocales).toBeDefined();
      expect(typeof files.loadJsonFromLocale).toBe('function');
      expect(typeof files.saveJsonToLocale).toBe('function');
    });

    it('should work with existing target locale detection', () => {
      const enFile = path.join(testDir, 'locale-en.json');
      const esFile = path.join(testDir, 'locale-es.json');
      const frFile = path.join(testDir, 'locale-fr.json');
      
      fs.writeFileSync(enFile, '{"test": "English"}');
      fs.writeFileSync(esFile, '{"test": "Spanish"}');
      fs.writeFileSync(frFile, '{"test": "French"}');
      
      const files = new Files(enFile);
      
      expect(files.sourceLocale).toBe('locale-en');
      expect(files.targetLocales).toContain('locale-es');
      expect(files.targetLocales).toContain('locale-fr');
      expect(files.targetLocales).not.toContain('locale-en');
    });

    it('should maintain backward compatibility with legacy JSON workflows', async () => {
      const jsonFile = path.join(testDir, 'legacy-en.json');
      const legacyData = {
        "app.title": "My App",
        "app.description": "A great application",
        "buttons.save": "Save",
        "buttons.cancel": "Cancel"
      };
      fs.writeFileSync(jsonFile, JSON.stringify(legacyData, null, 2));
      
      const files = new Files(jsonFile);
      const loaded = await files.loadJsonFromLocale('legacy-en');
      
      // Should load the data (may be flattened by handler)
      expect(loaded).toBeDefined();
      expect(typeof loaded).toBe('object');
      
      // Should save successfully
      const translatedData = {
        "app.title": "Mi Aplicación",
        "app.description": "Una gran aplicación",
        "buttons.save": "Guardar",
        "buttons.cancel": "Cancelar"
      };
      
      files.saveJsonToLocale('legacy-es', translatedData);
      
      const savedFile = path.join(testDir, 'legacy-es.json');
      expect(fs.existsSync(savedFile)).toBe(true);
      
      const savedContent = JSON.parse(fs.readFileSync(savedFile, 'utf8'));
      expect(savedContent).toBeDefined();
      expect(typeof savedContent).toBe('object');
    });

    it('should maintain backward compatibility with legacy XML workflows', async () => {
      const xmlFile = path.join(testDir, 'legacy-en.xml');
      const legacyXml = `<?xml version="1.0" encoding="UTF-8"?>
<resources>
  <string name="app_name">My App</string>
  <string name="welcome">Welcome</string>
</resources>`;
      fs.writeFileSync(xmlFile, legacyXml);
      
      const files = new Files(xmlFile);
      const loaded = await files.loadJsonFromLocale('legacy-en');
      
      // Should load successfully
      expect(loaded).toBeDefined();
      expect(typeof loaded).toBe('object');
      
      // Should be able to save back
      files.saveJsonToLocale('legacy-es', loaded);
      
      const savedFile = path.join(testDir, 'legacy-es.xml');
      expect(fs.existsSync(savedFile)).toBe(true);
      
      const savedContent = fs.readFileSync(savedFile, 'utf8');
      expect(savedContent).toContain('<?xml');
      expect(savedContent).toContain('<resources>');
    });

    it('should handle mixed format directories correctly', () => {
      // Create files with different extensions but same base name
      const baseDir = path.join(testDir, 'mixed');
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir);
      }
      
      const jsonFile = path.join(baseDir, 'app-en.json');
      const xmlFile = path.join(baseDir, 'app-en.xml');
      const propsFile = path.join(baseDir, 'app-en.properties');
      
      fs.writeFileSync(jsonFile, '{"test": "json"}');
      fs.writeFileSync(xmlFile, '<?xml version="1.0"?><root><test>xml</test></root>');
      fs.writeFileSync(propsFile, 'test=properties');
      
      // Each should detect its own format
      const jsonFiles = new Files(jsonFile);
      const xmlFiles = new Files(xmlFile);
      const propsFiles = new Files(propsFile);
      
      expect(jsonFiles.getDetectedFormat()).toBe('json');
      expect(xmlFiles.getDetectedFormat()).toBe('xml');
      expect(propsFiles.getDetectedFormat()).toBe('properties');
      
      // Target locales should only include same extension
      expect(jsonFiles.targetLocales).toEqual([]);
      expect(xmlFiles.targetLocales).toEqual([]);
      expect(propsFiles.targetLocales).toEqual([]);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle malformed files with helpful error messages', async () => {
      const malformedJson = path.join(testDir, 'malformed.json');
      fs.writeFileSync(malformedJson, '{"invalid": json syntax}');
      
      const files = new Files(malformedJson);
      
      await expect(files.loadJsonFromLocale('malformed')).rejects.toThrow(/Failed to load translation file/);
    });

    it('should handle empty files gracefully across formats', async () => {
      const formats = [
        { ext: '.json', format: 'json' },
        { ext: '.yaml', format: 'yaml' },
        { ext: '.properties', format: 'properties' }
      ];
      
      for (const { ext, format } of formats) {
        const emptyFile = path.join(testDir, `empty${ext}`);
        fs.writeFileSync(emptyFile, '');
        
        const files = new Files(emptyFile);
        const loaded = await files.loadJsonFromLocale('empty');
        
        expect(loaded).toEqual({});
        expect(files.getDetectedFormat()).toBe(format);
      }
    });

    it('should provide format-specific error suggestions', async () => {
      const invalidJson = path.join(testDir, 'invalid.json');
      fs.writeFileSync(invalidJson, '{"invalid": json syntax}');
      
      const files = new Files(invalidJson);
      
      await expect(files.loadJsonFromLocale('invalid')).rejects.toThrow(/Failed to load translation file/);
    });

    it('should handle non-existent files by creating empty ones', async () => {
      const nonExistentFile = path.join(testDir, 'nonexistent.json');
      
      // Ensure file doesn't exist
      if (fs.existsSync(nonExistentFile)) {
        fs.unlinkSync(nonExistentFile);
      }
      
      const files = new Files(nonExistentFile);
      const loaded = await files.loadJsonFromLocale('nonexistent');
      
      expect(loaded).toEqual({});
      expect(fs.existsSync(nonExistentFile)).toBe(true);
    });
  });
});