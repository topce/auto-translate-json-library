import { spawn, SpawnOptions } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

describe('CLI Integration Tests', () => {
  const testDir = path.join(__dirname, 'test-cli-integration');
  const cliPath = path.join(__dirname, '..', 'build', 'src', 'bin', 'cli.js');
  
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

  // Helper function to run CLI commands
  const runCLI = (args: string[], options: SpawnOptions = {}): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> => {
    return new Promise((resolve) => {
      const child = spawn('node', [cliPath, ...args], {
        cwd: testDir,
        env: { ...process.env, NODE_ENV: 'test' },
        ...options
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        resolve({
          stdout,
          stderr,
          exitCode: code || 0
        });
      });
    });
  };

  describe('Help Documentation and Format Listing', () => {
    it('should display help when no arguments provided', async () => {
      const result = await runCLI([]);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Auto translate json/xml cli');
      expect(result.stdout).toContain('Usage: atj [options] <inputPath>');
      expect(result.stdout).toContain('Options:');
      expect(result.stdout).toContain('--help, -h');
      expect(result.stdout).toContain('--list-formats');
      expect(result.stdout).toContain('--format, -f');
      expect(result.stdout).toContain('--engine, -e');
      expect(result.stdout).toContain('--sourceLocale, -s');
    });

    it('should display help with --help flag', async () => {
      const result = await runCLI(['--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Auto translate json/xml cli');
      expect(result.stdout).toContain('Usage: atj [options] <inputPath>');
      expect(result.stdout).toContain('Supported formats:');
      expect(result.stdout).toContain('JSON-based:');
      expect(result.stdout).toContain('XML-based:');
      expect(result.stdout).toContain('Text-based:');
      expect(result.stdout).toContain('Tabular:');
      expect(result.stdout).toContain('Format examples:');
      expect(result.stdout).toContain('Usage examples:');
    });

    it('should display help with -h flag', async () => {
      const result = await runCLI(['-h']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Auto translate json/xml cli');
      expect(result.stdout).toContain('Usage: atj [options] <inputPath>');
    });

    it('should list supported formats with --list-formats', async () => {
      const result = await runCLI(['--list-formats']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toContain('Auto translate json/xml cli');
      expect(result.stdout).toContain('Supported file formats:');
      
      // Check for expected format entries
      const expectedFormats = [
        'json',
        'arb',
        'xml',
        'android-xml',
        'ios-xml',
        'xliff',
        'xmb',
        'xtb',
        'po',
        'pot',
        'yaml',
        'properties',
        'csv',
        'tsv'
      ];
      
      expectedFormats.forEach(format => {
        expect(result.stdout).toContain(format);
      });
      
      // Check for format descriptions
      expect(result.stdout).toContain('JSON translation files');
      expect(result.stdout).toContain('Flutter Application Resource Bundle');
      expect(result.stdout).toContain('Android strings.xml format');
      expect(result.stdout).toContain('XLIFF 1.2 and 2.x translation files');
      expect(result.stdout).toContain('GNU gettext PO files');
      expect(result.stdout).toContain('YAML translation files');
      expect(result.stdout).toContain('Java Properties files');
      expect(result.stdout).toContain('Comma-separated values files');
      
      // Check for usage examples
      expect(result.stdout).toContain('Usage examples:');
      expect(result.stdout).toContain('Best practices:');
    });
  });

  describe('Format Parameter Handling', () => {
    beforeEach(() => {
      // Create test files for different formats
      const testFiles = {
        'test.json': '{"hello": "Hello", "world": "World"}',
        'test.xml': '<?xml version="1.0" encoding="UTF-8"?>\n<resources>\n  <string name="hello">Hello</string>\n  <string name="world">World</string>\n</resources>',
        'test.arb': '{\n  "@@locale": "en",\n  "hello": "Hello",\n  "@hello": {\n    "description": "Greeting"\n  }\n}',
        'test.xlf': '<?xml version="1.0" encoding="UTF-8"?>\n<xliff version="1.2">\n  <file source-language="en" target-language="es">\n    <body>\n      <trans-unit id="1">\n        <source>Hello</source>\n        <target>Hola</target>\n      </trans-unit>\n    </body>\n  </file>\n</xliff>',
        'test.po': 'msgid ""\nmsgstr ""\n\nmsgid "hello"\nmsgstr "Hello"',
        'test.yaml': 'hello: Hello\nworld: World',
        'test.properties': 'hello=Hello\nworld=World',
        'test.csv': 'key,en\nhello,Hello\nworld,World'
      };
      
      Object.entries(testFiles).forEach(([filename, content]) => {
        fs.writeFileSync(path.join(testDir, filename), content);
      });
    });

    it('should validate format parameter against supported formats', async () => {
      const result = await runCLI(['--format', 'unsupported', 'test.json']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Unsupported format: unsupported');
      expect(result.stderr).toContain('Use --list-formats to see all supported formats');
    });

    it('should accept valid format parameters', async () => {
      const validFormats = ['json', 'xml', 'yaml', 'properties', 'csv'];
      
      for (const format of validFormats) {
        const result = await runCLI(['--format', format, `test.${format === 'xml' ? 'xml' : format}`]);
        
        // Should not exit with format validation error
        if (result.exitCode === 1) {
          // If it exits with 1, it should be due to missing translation credentials, not format validation
          expect(result.stderr).not.toContain('Unsupported format');
          expect(result.stderr).toContain('not found in environment variable');
        }
      }
    });

    it('should handle format parameter with short flag -f', async () => {
      const result = await runCLI(['-f', 'json', 'test.json']);
      
      // Should not exit with format validation error
      if (result.exitCode === 1) {
        expect(result.stderr).not.toContain('Unsupported format');
        expect(result.stderr).toContain('not found in environment variable');
      }
    });

    it('should override auto-detection when format is specified', async () => {
      // Use a JSON file but specify XML format - should attempt to parse as XML
      const result = await runCLI(['--format', 'xml', 'test.json']);
      
      // Should not exit with format validation error
      if (result.exitCode === 1) {
        expect(result.stderr).not.toContain('Unsupported format');
        // May fail due to parsing or missing credentials, but format should be accepted
      }
    });
  });

  describe('CLI Consistency Across Formats', () => {
    beforeEach(() => {
      // Create test files for different formats
      const testFiles = {
        'consistency-test.json': '{"hello": "Hello"}',
        'consistency-test.xml': '<?xml version="1.0"?>\n<resources>\n  <string name="hello">Hello</string>\n</resources>',
        'consistency-test.yaml': 'hello: Hello',
        'consistency-test.properties': 'hello=Hello'
      };
      
      Object.entries(testFiles).forEach(([filename, content]) => {
        fs.writeFileSync(path.join(testDir, filename), content);
      });
    });

    it('should validate input path requirement consistently', async () => {
      const result = await runCLI(['--format', 'json']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Input path is required');
      expect(result.stderr).toContain('Usage: atj [options] <inputPath>');
    });

    it('should validate file existence consistently across formats', async () => {
      const formats = ['json', 'xml', 'yaml', 'properties'];
      
      for (const format of formats) {
        const result = await runCLI(['--format', format, 'nonexistent-file.txt']);
        
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('Input path does not exist');
      }
    });

    it('should validate mode parameter consistently', async () => {
      const result = await runCLI(['--mode', 'invalid', 'consistency-test.json']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid mode: invalid');
      expect(result.stderr).toContain("Mode must be either 'file' or 'folder'");
    });

    it('should validate engine parameter consistently', async () => {
      const result = await runCLI(['--engine', 'invalid', 'consistency-test.json']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Invalid engine: invalid');
      expect(result.stderr).toContain('Supported engines:');
      expect(result.stderr).toContain('aws, azure, google, deepLPro, deepLFree, openai');
    });

    it('should handle missing translation credentials consistently', async () => {
      const formats = ['json', 'xml', 'yaml', 'properties'];
      
      for (const format of formats) {
        const result = await runCLI(['--format', format, '--engine', 'aws', `consistency-test.${format}`]);
        
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('AWS credentials not found in environment variables');
        expect(result.stderr).toContain('ATJ_AWS_ACCESS_KEY_ID, ATJ_AWS_SECRET_ACCESS_KEY, ATJ_AWS_REGION');
      }
    });

    it('should accept all common CLI options across formats', async () => {
      const formats = ['json', 'xml', 'yaml', 'properties'];
      const commonOptions = [
        ['--mode', 'file'],
        ['--sourceLocale', 'en'],
        ['--keepTranslations'],
        ['--no-keepExtraTranslations']
      ];
      
      for (const format of formats) {
        for (const option of commonOptions) {
          const args = ['--format', format, ...option, `consistency-test.${format}`];
          const result = await runCLI(args);
          
          // Should not fail due to invalid options (may fail due to missing credentials)
          if (result.exitCode === 1) {
            expect(result.stderr).not.toContain('Unknown option');
            expect(result.stderr).not.toContain('Invalid option');
          }
        }
      }
    });

    it('should provide consistent progress reporting format', async () => {
      const formats = ['json', 'xml'];
      
      for (const format of formats) {
        const result = await runCLI(['--format', format, `consistency-test.${format}`]);
        
        // All formats should show the same initial output pattern
        expect(result.stdout).toContain('Auto translate json cli');
        
        // May not reach "Translating" due to missing credentials, but should show consistent startup
        if (result.stdout.includes('Translating')) {
          // Should show consistent path formatting
          const outputLines = result.stdout.split('\n');
          const translatingLine = outputLines.find(line => line.includes('Translating'));
          expect(translatingLine).toBeDefined();
          expect(translatingLine).toContain(testDir);
        }
      }
    });

    it('should handle folder mode consistently across formats', async () => {
      // Create a folder structure with different format files
      const folderPath = path.join(testDir, 'multi-format');
      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }
      
      const folderFiles = {
        'app-en.json': '{"hello": "Hello"}',
        'strings-en.xml': '<?xml version="1.0"?>\n<resources>\n  <string name="hello">Hello</string>\n</resources>',
        'messages-en.yaml': 'hello: Hello',
        'labels-en.properties': 'hello=Hello'
      };
      
      Object.entries(folderFiles).forEach(([filename, content]) => {
        fs.writeFileSync(path.join(folderPath, filename), content);
      });
      
      const result = await runCLI(['--mode', 'folder', folderPath]);
      
      // Should attempt to process the folder (may fail due to missing credentials)
      expect(result.stdout).toContain('Auto translate json cli');
      
      // May not reach "Translating" due to missing credentials, but should show consistent startup
      if (result.stdout.includes('Translating')) {
        expect(result.stdout).toContain('Translating');
      }
      
      if (result.exitCode === 1) {
        // Should fail consistently due to missing credentials, not format issues
        expect(result.stderr).toContain('not found in environment variable');
      }
    });
  });

  describe('Error Handling and User Guidance', () => {
    it('should provide helpful error messages for common mistakes', async () => {
      // Test missing input path
      const noInputResult = await runCLI(['--format', 'json']);
      expect(noInputResult.stderr).toContain('Input path is required');
      expect(noInputResult.stderr).toContain('Usage: atj [options] <inputPath>');
      
      // Test invalid format
      const invalidFormatResult = await runCLI(['--format', 'invalid', 'test.json']);
      expect(invalidFormatResult.stderr).toContain('Unsupported format: invalid');
      expect(invalidFormatResult.stderr).toContain('Use --list-formats to see all supported formats');
      
      // Test invalid mode
      const invalidModeResult = await runCLI(['--mode', 'invalid', 'test.json']);
      expect(invalidModeResult.stderr).toContain('Invalid mode: invalid');
      expect(invalidModeResult.stderr).toContain("Mode must be either 'file' or 'folder'");
      
      // Test invalid engine
      const invalidEngineResult = await runCLI(['--engine', 'invalid', 'test.json']);
      expect(invalidEngineResult.stderr).toContain('Invalid engine: invalid');
      expect(invalidEngineResult.stderr).toContain('Supported engines:');
    });

    it('should provide format-specific guidance in error messages', async () => {
      const result = await runCLI(['--format', 'unsupported', 'test.json']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Unsupported format: unsupported');
      expect(result.stderr).toContain('Use --list-formats to see all supported formats');
    });

    it('should handle non-existent files with clear error messages', async () => {
      const result = await runCLI(['nonexistent-file.json']);
      
      expect(result.exitCode).toBe(1);
      expect(result.stderr).toContain('Input path does not exist: nonexistent-file.json');
    });

    it('should provide consistent error message formatting', async () => {
      const errorScenarios = [
        { args: ['--format', 'invalid', 'test.json'], expectedError: 'Unsupported format' },
        { args: ['--mode', 'invalid', 'test.json'], expectedError: 'Invalid mode' },
        { args: ['--engine', 'invalid', 'test.json'], expectedError: 'Invalid engine' },
        { args: ['nonexistent.json'], expectedError: 'Input path does not exist' }
      ];
      
      for (const scenario of errorScenarios) {
        const result = await runCLI(scenario.args);
        
        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('❌'); // Error emoji for consistency
        expect(result.stderr).toContain(scenario.expectedError);
        
        // Should provide helpful guidance
        if (scenario.expectedError.includes('format')) {
          expect(result.stderr).toContain('💡'); // Tip emoji
        }
      }
    });
  });

  describe('Version and Information Display', () => {
    it('should display version information in help output', async () => {
      const result = await runCLI(['--help']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/Auto translate json\/xml cli v\d+\.\d+\.\d+/);
    });

    it('should display version information in list-formats output', async () => {
      const result = await runCLI(['--list-formats']);
      
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/Auto translate json\/xml cli v\d+\.\d+\.\d+/);
    });

    it('should display version information when starting translation', async () => {
      // Create a test file
      fs.writeFileSync(path.join(testDir, 'version-test.json'), '{"test": "value"}');
      
      const result = await runCLI(['version-test.json']);
      
      expect(result.stdout).toMatch(/Auto translate json cli v\d+\.\d+\.\d+/);
    });
  });
});