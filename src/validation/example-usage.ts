/**
 * Example usage of the comprehensive validation and error handling system
 * This file demonstrates how to use the validation system in practice
 */

import { ValidationService, initializeValidation } from "./index";
import { JsonHandler } from "../format/json-handler";
import { XliffHandler } from "../format/xliff-handler";
import { ArbHandler } from "../format/arb-handler";

// Initialize the validation system
initializeValidation();

/**
 * Example: Validate a JSON file with error recovery
 */
export async function validateJsonExample() {
  const jsonHandler = new JsonHandler();
  
  // Example of corrupted JSON with trailing comma
  const corruptedJson = `{
    "hello": "world",
    "goodbye": "universe",
  }`;

  const result = await ValidationService.validateFile(
    corruptedJson,
    'example.json',
    jsonHandler,
    {
      attemptRecovery: true,
      includeGuidance: true,
      strictMode: false
    }
  );

  console.log('JSON Validation Result:');
  console.log(ValidationService.createValidationReport(result));
  
  return result;
}

/**
 * Example: Validate an XLIFF file with strict mode
 */
export async function validateXliffExample() {
  const xliffHandler = new XliffHandler();
  
  // Example XLIFF with missing version
  const xliffContent = `<?xml version="1.0" encoding="UTF-8"?>
<xliff xmlns="urn:oasis:names:tc:xliff:document:1.2">
  <file original="test.properties" datatype="plaintext">
    <body>
      <trans-unit id="hello">
        <source>Hello</source>
        <target>Hola</target>
      </trans-unit>
    </body>
  </file>
</xliff>`;

  const result = await ValidationService.validateFile(
    xliffContent,
    'example.xlf',
    xliffHandler,
    {
      attemptRecovery: false,
      includeGuidance: true,
      strictMode: true
    }
  );

  console.log('XLIFF Validation Result:');
  console.log(ValidationService.createValidationReport(result));
  
  return result;
}

/**
 * Example: Validate an ARB file with ICU syntax
 */
export async function validateArbExample() {
  const arbHandler = new ArbHandler();
  
  // Example ARB with ICU syntax error
  const arbContent = `{
    "@@locale": "en",
    "welcome": "Welcome {name}!",
    "@welcome": {
      "description": "Welcome message",
      "placeholders": {
        "name": {
          "type": "String",
          "example": "John"
        }
      }
    },
    "itemCount": "{count, plural, =0{no items} =1{one item} other{# items}",
    "@itemCount": {
      "description": "Item count message"
    }
  }`;

  const result = await ValidationService.validateFile(
    arbContent,
    'example.arb',
    arbHandler,
    {
      attemptRecovery: true,
      includeGuidance: true,
      strictMode: false
    }
  );

  console.log('ARB Validation Result:');
  console.log(ValidationService.createValidationReport(result));
  
  return result;
}

/**
 * Example: Handle completely corrupted file with fallback recovery
 */
export async function validateCorruptedFileExample() {
  const jsonHandler = new JsonHandler();
  
  // Completely corrupted content
  const corruptedContent = `This is not JSON at all!
But it might contain some "translatable strings" here and there.
Maybe even some 'quoted text' that could be useful.
Error: malformed data everywhere...`;

  const result = await ValidationService.validateFile(
    corruptedContent,
    'corrupted.json',
    jsonHandler,
    {
      attemptRecovery: true,
      includeGuidance: true,
      strictMode: false
    }
  );

  console.log('Corrupted File Recovery Result:');
  console.log(ValidationService.createValidationReport(result));
  
  return result;
}

/**
 * Example: Batch validation of multiple files
 */
export async function batchValidationExample() {
  const files = [
    { content: '{"key": "value"}', path: 'valid.json', handler: new JsonHandler() },
    { content: '{"key": "value",}', path: 'trailing-comma.json', handler: new JsonHandler() },
    { content: '{"@@locale": "en", "msg": "Hello"}', path: 'valid.arb', handler: new ArbHandler() }
  ];

  console.log('Batch Validation Results:');
  console.log('='.repeat(80));

  for (const file of files) {
    const result = await ValidationService.validateFile(
      file.content,
      file.path,
      file.handler,
      { attemptRecovery: true, includeGuidance: false }
    );

    const status = result.success ? '✅ PASS' : '❌ FAIL';
    const summary = result.validationResult.getSummary();
    
    console.log(`${status} ${file.path}: ${summary}`);
    
    if (!result.success && result.recoveryResult?.success) {
      console.log(`  🔧 Recovered using: ${result.recoveryResult.recoveryMethod}`);
    }
  }
  
  console.log('='.repeat(80));
}

// Export all examples for testing
export const validationExamples = {
  validateJsonExample,
  validateXliffExample,
  validateArbExample,
  validateCorruptedFileExample,
  batchValidationExample
};