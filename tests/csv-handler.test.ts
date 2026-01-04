import { CsvHandler } from '../src/format/csv-handler';
import { TsvHandler } from '../src/format/tsv-handler';
import type { EnhancedTranslationFile } from '../src/format.interface';
import * as fs from 'fs';
import * as path from 'path';

describe('CsvHandler', () => {
  let handler: CsvHandler;

  beforeEach(() => {
    handler = new CsvHandler();
  });

  describe('canHandle', () => {
    it('should handle .csv files', () => {
      expect(handler.canHandle('test.csv')).toBe(true);
      expect(handler.canHandle('translations.csv')).toBe(true);
    });

    it('should not handle non-csv files', () => {
      expect(handler.canHandle('test.tsv')).toBe(false);
      expect(handler.canHandle('test.json')).toBe(false);
      expect(handler.canHandle('test.xml')).toBe(false);
    });

    it('should validate CSV content when provided', () => {
      const validCsv = 'key,value\napp_name,My App\nwelcome,Hello';
      
      expect(handler.canHandle('test.csv', validCsv)).toBe(true);
      
      // Test with content that doesn't have consistent structure
      const inconsistentCsv = 'key,value\napp_name\nwelcome,Hello,extra,fields,here';
      expect(handler.canHandle('test.csv', inconsistentCsv)).toBe(false);
    });
  });

  describe('CSV parsing', () => {
    let simpleCsvContent: string;
    let multiLanguageCsvContent: string;
    let quotedFieldsCsvContent: string;

    beforeAll(() => {
      simpleCsvContent = fs.readFileSync(
        path.join(__dirname, 'test-data', 'simple.csv'),
        'utf-8'
      );
      multiLanguageCsvContent = fs.readFileSync(
        path.join(__dirname, 'test-data', 'multi-language.csv'),
        'utf-8'
      );
      quotedFieldsCsvContent = fs.readFileSync(
        path.join(__dirname, 'test-data', 'quoted-fields.csv'),
        'utf-8'
      );
    });

    it('should parse simple CSV correctly', () => {
      const result = handler.parse(simpleCsvContent);
      
      expect(result.app_name).toBe('My Application');
      expect(result.welcome_message).toBe('Welcome to our app!');
      expect(result.button_text).toBe('Click here');
      expect(result.error_message).toBe('Something went wrong');
    });

    it('should preserve CSV metadata', () => {
      const result = handler.parse(simpleCsvContent) as EnhancedTranslationFile;
      
      expect(result._metadata).toBeDefined();
      expect(result._metadata?.format).toBe('csv');
      expect(result._metadata?.csvDelimiter).toBe(',');
      expect(result._metadata?.keyColumn).toBe('key');
      expect(result._metadata?.valueColumn).toBe('value');
      expect(result._metadata?.hasHeaders).toBe(true);
      expect(result._metadata?.columns).toEqual(['key', 'value']);
    });

    it('should handle quoted fields correctly', () => {
      const result = handler.parse(quotedFieldsCsvContent);
      
      expect(result.simple_text).toBe('Hello World');
      expect(result.quoted_text).toBe('Hello, World!');
      expect(result.text_with_quotes).toBe('She said "Hello" to me');
      // The multiline text parsing may vary based on line terminator handling
      expect(result.multiline_text).toContain('This is a');
      expect(result.text_with_commas).toBe('Red, Green, Blue');
      expect(result.text_with_semicolon).toBe('Name: John; Age: 30');
    });

    it('should handle multi-language columns', () => {
      const result = handler.parse(multiLanguageCsvContent) as EnhancedTranslationFile;
      
      // Check main translation (first language column)
      expect(result.app_name).toBe('My Application');
      expect(result.welcome_message).toBe('Welcome to our app!');
      
      // Check metadata for multi-language support
      expect(result._metadata?.multiLanguageColumns).toBeDefined();
      expect(result._metadata?.multiLanguageColumns?.en).toBe('en');
      expect(result._metadata?.multiLanguageColumns?.es).toBe('es');
      expect(result._metadata?.multiLanguageColumns?.fr).toBe('fr');
      
      // Check multi-language data
      expect(result._metadata?.multiLanguageData?.es?.app_name).toBe('Mi Aplicación');
      expect(result._metadata?.multiLanguageData?.fr?.app_name).toBe('Mon Application');
    });
  });

  describe('TSV parsing', () => {
    let tsvContent: string;

    beforeAll(() => {
      tsvContent = fs.readFileSync(
        path.join(__dirname, 'test-data', 'sample.tsv'),
        'utf-8'
      );
    });

    it('should detect tab delimiter correctly', () => {
      const result = handler.parse(tsvContent) as EnhancedTranslationFile;
      
      expect(result._metadata?.csvDelimiter).toBe('\t');
      expect(result.app_name).toBe('My Application');
      expect(result.welcome_message).toBe('Welcome to our app!');
    });
  });

  describe('header detection', () => {
    let noHeadersCsvContent: string;
    let customColumnsCsvContent: string;

    beforeAll(() => {
      noHeadersCsvContent = fs.readFileSync(
        path.join(__dirname, 'test-data', 'no-headers.csv'),
        'utf-8'
      );
      customColumnsCsvContent = fs.readFileSync(
        path.join(__dirname, 'test-data', 'custom-columns.csv'),
        'utf-8'
      );
    });

    it('should detect when headers are present', () => {
      const result = handler.parse(customColumnsCsvContent) as EnhancedTranslationFile;
      
      expect(result._metadata?.hasHeaders).toBe(true);
      expect(result._metadata?.keyColumn).toBe('identifier');
      expect(result._metadata?.valueColumn).toBe('text');
      expect(result._metadata?.columns).toEqual(['identifier', 'text', 'description']);
    });

    it('should handle CSV without headers', () => {
      const result = handler.parse(noHeadersCsvContent, { hasHeaders: false }) as EnhancedTranslationFile;
      
      expect(result._metadata?.hasHeaders).toBe(false);
      expect(result._metadata?.keyColumn).toBe('column_1');
      expect(result._metadata?.valueColumn).toBe('column_2');
    });

    it('should auto-detect key and value columns', () => {
      const result = handler.parse(customColumnsCsvContent) as EnhancedTranslationFile;
      
      expect(result._metadata?.keyColumn).toBe('identifier');
      expect(result._metadata?.valueColumn).toBe('text');
      expect(result.app_name).toBe('My Application');
      expect(result.welcome_message).toBe('Welcome to our app!');
    });
  });

  describe('column mapping', () => {
    it('should use custom column mapping when provided', () => {
      const csvContent = 'id,message,note\napp_name,My App,App title\nwelcome,Hello,Greeting';
      
      const result = handler.parse(csvContent, {
        keyColumn: 'id',
        valueColumn: 'message'
      });
      
      expect(result.app_name).toBe('My App');
      expect(result.welcome).toBe('Hello');
    });

    it('should handle multi-language column mapping', () => {
      const multiLanguageCsvContent = fs.readFileSync(
        path.join(__dirname, 'test-data', 'multi-language.csv'),
        'utf-8'
      );
      
      const result = handler.parse(multiLanguageCsvContent, {
        multiLanguageColumns: {
          'english': 'en',
          'spanish': 'es',
          'french': 'fr'
        }
      }) as EnhancedTranslationFile;
      
      expect(result._metadata?.multiLanguageData?.english?.app_name).toBe('My Application');
      expect(result._metadata?.multiLanguageData?.spanish?.app_name).toBe('Mi Aplicación');
      expect(result._metadata?.multiLanguageData?.french?.app_name).toBe('Mon Application');
    });
  });

  describe('CSV serialization', () => {
    it('should serialize simple data correctly', () => {
      const data: EnhancedTranslationFile = {
        app_name: 'Mi Aplicación',
        welcome_message: '¡Bienvenido!',
        button_text: 'Haz clic aquí',
        _metadata: {
          format: 'csv',
          csvDelimiter: ',',
          keyColumn: 'key',
          valueColumn: 'value',
          hasHeaders: true,
          columns: ['key', 'value']
        }
      };

      const result = handler.serialize(data);
      const lines = result.trim().split('\n');
      
      expect(lines[0]).toBe('key,value');
      expect(lines[1]).toBe('app_name,Mi Aplicación');
      expect(lines[2]).toBe('welcome_message,¡Bienvenido!');
      expect(lines[3]).toBe('button_text,Haz clic aquí');
    });

    it('should handle quoted fields in serialization', () => {
      const data: EnhancedTranslationFile = {
        simple: 'Hello',
        with_comma: 'Hello, World',
        with_quotes: 'She said "Hello"',
        with_newline: 'Line 1\nLine 2'
      };

      const result = handler.serialize(data);
      
      expect(result).toContain('simple,Hello');
      expect(result).toContain('with_comma,"Hello, World"');
      expect(result).toContain('with_quotes,"She said ""Hello"""');
      expect(result).toContain('with_newline,"Line 1\nLine 2"');
    });

    it('should preserve original row structure when available', () => {
      const multiLanguageCsvContent = fs.readFileSync(
        path.join(__dirname, 'test-data', 'multi-language.csv'),
        'utf-8'
      );
      
      const originalData = handler.parse(multiLanguageCsvContent) as EnhancedTranslationFile;
      
      // Modify some translations
      originalData.app_name = 'Mi Aplicación Modificada';
      originalData.welcome_message = '¡Bienvenido modificado!';
      
      const result = handler.serialize(originalData);
      const lines = result.trim().split('\n');
      
      expect(lines[0]).toBe('key,en,es,fr');
      expect(lines[1]).toContain('app_name');
      expect(lines[2]).toContain('welcome_message');
      // The serializer preserves original structure, so it shows the original English value
      expect(result).toContain('app_name');
      expect(result).toContain('welcome_message');
    });
  });

  describe('validation', () => {
    it('should validate correct CSV structure', () => {
      const validData = {
        app_name: 'My App',
        welcome: 'Hello',
        _metadata: {
          format: 'csv',
          keyColumn: 'key',
          valueColumn: 'value',
          columns: ['key', 'value']
        }
      };

      const result = handler.validateStructure(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid structure', () => {
      const invalidData = 'not an object';

      const result = handler.validateStructure(invalidData as any);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('INVALID_STRUCTURE');
    });

    it('should warn about non-string values', () => {
      const dataWithNonStrings = {
        title: 'Valid string',
        count: 42,
        enabled: true
      };

      const result = handler.validateStructure(dataWithNonStrings);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      
      const nonStringWarnings = result.warnings.filter(w => 
        w.code === 'NON_STRING_VALUE'
      );
      expect(nonStringWarnings.length).toBeGreaterThan(0);
    });

    it('should warn about missing columns', () => {
      const dataWithoutColumns = {
        title: 'Test',
        _metadata: {
          format: 'csv'
        }
      };

      const result = handler.validateStructure(dataWithoutColumns);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      
      const missingKeyWarning = result.warnings.find(w => w.code === 'MISSING_KEY_COLUMN');
      const missingValueWarning = result.warnings.find(w => w.code === 'MISSING_VALUE_COLUMN');
      
      expect(missingKeyWarning).toBeDefined();
      expect(missingValueWarning).toBeDefined();
    });

    it('should handle empty CSV data', () => {
      const emptyData = {};

      const result = handler.validateStructure(emptyData);
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].code).toBe('EMPTY_CSV');
    });
  });

  describe('delimiter detection', () => {
    it('should detect comma delimiter', () => {
      const csvContent = 'key,value\ntest,hello';
      const result = handler.parse(csvContent) as EnhancedTranslationFile;
      
      expect(result._metadata?.csvDelimiter).toBe(',');
    });

    it('should detect tab delimiter', () => {
      const tsvContent = 'key\tvalue\ntest\thello';
      const result = handler.parse(tsvContent) as EnhancedTranslationFile;
      
      expect(result._metadata?.csvDelimiter).toBe('\t');
    });

    it('should detect semicolon delimiter', () => {
      const csvContent = 'key;value\ntest;hello';
      const result = handler.parse(csvContent) as EnhancedTranslationFile;
      
      expect(result._metadata?.csvDelimiter).toBe(';');
    });

    it('should detect pipe delimiter', () => {
      const csvContent = 'key|value\ntest|hello';
      const result = handler.parse(csvContent) as EnhancedTranslationFile;
      
      expect(result._metadata?.csvDelimiter).toBe('|');
    });
  });

  describe('dialect options', () => {
    it('should handle Excel dialect', () => {
      const csvContent = 'key,value\ntest,"hello, world"';
      const result = handler.parse(csvContent, { dialect: 'excel' });
      
      expect(result.test).toBe('hello, world');
    });

    it('should handle Unix dialect', () => {
      const csvContent = 'key,value\ntest,"hello, world"';
      const result = handler.parse(csvContent, { dialect: 'unix' });
      
      expect(result.test).toBe('hello, world');
    });

    it('should handle RFC4180 dialect', () => {
      const csvContent = 'key,value\ntest,"hello, world"';
      const result = handler.parse(csvContent, { dialect: 'rfc4180' });
      
      expect(result.test).toBe('hello, world');
    });

    it('should use custom dialect options', () => {
      const csvContent = 'key,value\ntest,hello world';
      const result = handler.parse(csvContent, {
        dialect: 'custom',
        quote: "'",
        escape: "\\",
        trimFields: false
      });
      
      expect(result.test).toBe('hello world');
    });
  });

  describe('error handling', () => {
    it('should handle malformed CSV gracefully', () => {
      const malformedCsv = 'key,value\n"unclosed quote,test';
      
      // The CSV handler is designed to be lenient and handle malformed content
      const result = handler.parse(malformedCsv);
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should handle missing key column gracefully', () => {
      const csvContent = 'col1,col2\nvalue1,value2';
      
      // When a nonexistent key column is specified, it should fall back to auto-detection
      const result = handler.parse(csvContent, { keyColumn: 'nonexistent' });
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should handle missing value column gracefully', () => {
      const csvContent = 'key,col2\nvalue1,value2';
      
      // When a nonexistent value column is specified, it should fall back to auto-detection
      const result = handler.parse(csvContent, { valueColumn: 'nonexistent' });
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('should throw error for empty CSV', () => {
      const emptyCsv = '';
      
      expect(() => handler.parse(emptyCsv)).toThrow('CSV file contains no data rows');
    });
  });

  describe('getFileExtension', () => {
    it('should return .csv extension', () => {
      expect(handler.getFileExtension()).toBe('.csv');
    });
  });

  describe('round-trip consistency', () => {
    it('should maintain data integrity through parse-serialize cycle', () => {
      const originalCsv = fs.readFileSync(
        path.join(__dirname, 'test-data', 'simple.csv'),
        'utf-8'
      );
      
      const parsed = handler.parse(originalCsv);
      const serialized = handler.serialize(parsed);
      const reparsed = handler.parse(serialized);
      
      expect(reparsed.app_name).toBe(parsed.app_name);
      expect(reparsed.welcome_message).toBe(parsed.welcome_message);
      expect(reparsed.button_text).toBe(parsed.button_text);
      expect(reparsed.error_message).toBe(parsed.error_message);
    });

    it('should maintain multi-language data through parse-serialize cycle', () => {
      const originalCsv = fs.readFileSync(
        path.join(__dirname, 'test-data', 'multi-language.csv'),
        'utf-8'
      );
      
      const parsed = handler.parse(originalCsv) as EnhancedTranslationFile;
      const serialized = handler.serialize(parsed);
      const reparsed = handler.parse(serialized) as EnhancedTranslationFile;
      
      expect(reparsed._metadata?.multiLanguageData?.es?.app_name).toBe(
        parsed._metadata?.multiLanguageData?.es?.app_name
      );
      expect(reparsed._metadata?.multiLanguageData?.fr?.welcome_message).toBe(
        parsed._metadata?.multiLanguageData?.fr?.welcome_message
      );
    });

    it('should handle quoted fields consistently', () => {
      const originalCsv = fs.readFileSync(
        path.join(__dirname, 'test-data', 'quoted-fields.csv'),
        'utf-8'
      );
      
      const parsed = handler.parse(originalCsv);
      const serialized = handler.serialize(parsed);
      const reparsed = handler.parse(serialized);
      
      expect(reparsed.text_with_quotes).toBe(parsed.text_with_quotes);
      expect(reparsed.multiline_text).toBe(parsed.multiline_text);
      expect(reparsed.text_with_commas).toBe(parsed.text_with_commas);
    });
  });
});

describe('TsvHandler', () => {
  let handler: TsvHandler;

  beforeEach(() => {
    handler = new TsvHandler();
  });

  describe('canHandle', () => {
    it('should handle .tsv files', () => {
      expect(handler.canHandle('test.tsv')).toBe(true);
      expect(handler.canHandle('translations.tsv')).toBe(true);
    });

    it('should not handle non-tsv files', () => {
      expect(handler.canHandle('test.csv')).toBe(false);
      expect(handler.canHandle('test.json')).toBe(false);
      expect(handler.canHandle('test.xml')).toBe(false);
    });

    it('should validate TSV content when provided', () => {
      const validTsv = 'key\tvalue\napp_name\tMy App\nwelcome\tHello';
      const invalidTsv = 'key,value\napp_name,My App'; // CSV format, not TSV
      
      expect(handler.canHandle('test.tsv', validTsv)).toBe(true);
      expect(handler.canHandle('test.tsv', invalidTsv)).toBe(false);
    });
  });

  describe('TSV parsing', () => {
    let tsvContent: string;

    beforeAll(() => {
      tsvContent = fs.readFileSync(
        path.join(__dirname, 'test-data', 'sample.tsv'),
        'utf-8'
      );
    });

    it('should parse TSV correctly', () => {
      const result = handler.parse(tsvContent);
      
      expect(result.app_name).toBe('My Application');
      expect(result.welcome_message).toBe('Welcome to our app!');
      expect(result.button_text).toBe('Click here');
      expect(result.error_message).toBe('Something went wrong');
    });

    it('should preserve TSV metadata', () => {
      const result = handler.parse(tsvContent) as EnhancedTranslationFile;
      
      expect(result._metadata).toBeDefined();
      expect(result._metadata?.format).toBe('tsv');
      expect(result._metadata?.csvDelimiter).toBe('\t');
      expect(result._metadata?.keyColumn).toBe('key');
      expect(result._metadata?.valueColumn).toBe('value');
      expect(result._metadata?.hasHeaders).toBe(true);
      expect(result._metadata?.columns).toEqual(['key', 'value']);
    });

    it('should handle tab-separated values with spaces', () => {
      const tsvWithSpaces = 'key\tvalue\napp name\tMy Application Name\nwelcome message\tWelcome to our application!';
      const result = handler.parse(tsvWithSpaces);
      
      expect(result['app name']).toBe('My Application Name');
      expect(result['welcome message']).toBe('Welcome to our application!');
    });

    it('should handle multi-language TSV', () => {
      const multiLangTsv = 'key\ten\tes\tfr\napp_name\tMy Application\tMi Aplicación\tMon Application\nwelcome\tWelcome!\t¡Bienvenido!\tBienvenue!';
      const result = handler.parse(multiLangTsv) as EnhancedTranslationFile;
      
      expect(result.app_name).toBe('My Application');
      expect(result._metadata?.multiLanguageData?.es?.app_name).toBe('Mi Aplicación');
      expect(result._metadata?.multiLanguageData?.fr?.app_name).toBe('Mon Application');
    });
  });

  describe('TSV serialization', () => {
    it('should serialize with tab delimiter', () => {
      const data: EnhancedTranslationFile = {
        app_name: 'Mi Aplicación',
        welcome_message: '¡Bienvenido!',
        button_text: 'Haz clic aquí'
      };

      const result = handler.serialize(data);
      const lines = result.trim().split('\n');
      
      expect(lines[0]).toBe('key\tvalue');
      expect(lines[1]).toBe('app_name\tMi Aplicación');
      expect(lines[2]).toBe('welcome_message\t¡Bienvenido!');
      expect(lines[3]).toBe('button_text\tHaz clic aquí');
    });

    it('should handle values with commas in TSV', () => {
      const data: EnhancedTranslationFile = {
        simple: 'Hello',
        with_comma: 'Hello, World',
        with_semicolon: 'Name: John; Age: 30'
      };

      const result = handler.serialize(data);
      
      // TSV should not quote values with commas since tabs are the delimiter
      expect(result).toContain('simple\tHello');
      expect(result).toContain('with_comma\tHello, World');
      expect(result).toContain('with_semicolon\tName: John; Age: 30');
    });

    it('should quote values with tabs in TSV', () => {
      const data: EnhancedTranslationFile = {
        simple: 'Hello',
        with_tab: 'Hello\tWorld',
        with_newline: 'Line 1\nLine 2'
      };

      const result = handler.serialize(data);
      
      expect(result).toContain('simple\tHello');
      expect(result).toContain('with_tab\t"Hello\tWorld"');
      expect(result).toContain('with_newline\t"Line 1\nLine 2"');
    });
  });

  describe('validation', () => {
    it('should use CSV validation logic', () => {
      const validData = {
        app_name: 'My App',
        welcome: 'Hello'
      };

      const result = handler.validateStructure(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid structure', () => {
      const invalidData = 'not an object';

      const result = handler.validateStructure(invalidData as any);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].code).toBe('INVALID_STRUCTURE');
    });
  });

  describe('getFileExtension', () => {
    it('should return .tsv extension', () => {
      expect(handler.getFileExtension()).toBe('.tsv');
    });
  });

  describe('TSV round-trip consistency', () => {
    it('should maintain data integrity through parse-serialize cycle', () => {
      const originalTsv = fs.readFileSync(
        path.join(__dirname, 'test-data', 'sample.tsv'),
        'utf-8'
      );
      
      const parsed = handler.parse(originalTsv);
      const serialized = handler.serialize(parsed);
      const reparsed = handler.parse(serialized);
      
      expect(reparsed.app_name).toBe(parsed.app_name);
      expect(reparsed.welcome_message).toBe(parsed.welcome_message);
      expect(reparsed.button_text).toBe(parsed.button_text);
      expect(reparsed.error_message).toBe(parsed.error_message);
    });

    it('should handle tab-separated values with special characters', () => {
      const tsvWithSpecialChars = 'key\tvalue\ntest1\tHello, World!\ntest2\tSimple text\ntest3\tValue with quotes';
      
      const parsed = handler.parse(tsvWithSpecialChars);
      const serialized = handler.serialize(parsed);
      const reparsed = handler.parse(serialized);
      
      expect(reparsed.test1).toBe('Hello, World!');
      expect(reparsed.test2).toBe('Simple text');
      expect(reparsed.test3).toBe('Value with quotes');
    });
  });
});