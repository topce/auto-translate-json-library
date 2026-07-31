# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.1] - 2026-07-31

### 🐛 Dot-Key Collision Fix (JSON & YAML)

#### Fixed
- **Fixed crash on flat keys that collide under dot-nesting** (`src/format/json-handler.ts`, `src/format/yaml-handler.ts`): Serializing a translation set where one flat key is also a dot-boundary prefix of another (for example `admin.invite.circabc.admin` together with `admin.invite.circabc.admin.succeed`) threw `Failed to serialize JSON: Cannot create property 'succeed' on string '…'`. The same path cannot be both a string leaf and an object in a nested tree, and under ES module strict mode the assignment threw instead of failing silently.
  - `reconstructFromFlatStructure` is now collision-aware: keys involved in a dot-boundary prefix collision are preserved as literal (flat) keys, so the output stays lossless and valid. Non-colliding keys continue to nest exactly as before (backward compatible).
  - `setNestedValue` no longer throws on an incompatible shape; it reports the collision so the caller can keep the key literal, guarding against any residual mixed array/object cases.

#### Verification
- All 478 tests pass (12 suites), including new regression tests:
  - `tests/json-handler.test.ts`: 4 collision tests (no-throw, lossless preservation, mixed nest/flat, round-trip)
  - `tests/files-integration.test.ts`: end-to-end round-trip through `Files.load/saveJsonToLocale` (the real translate save path)
  - `tests/yaml-handler.test.ts`: 3 collision tests on the flat reconstruction path
- `npm run build` (tsc) succeeds
- Biome lint passes on changed source files
- `npm pack --dry-run` succeeds (91 files, 104.4 kB packed)

## [2.3.0] - 2026-07-31

### 🧹 Library Entry Cleanup & Dependency Updates

#### Fixed
- **Removed debug logging from production code**: Dropped the `🔍 DEBUG` `console.log` statements from the OpenAI translator (`src/openai.ts`) that were logging prompts and translation input/output.

#### Updated Dependencies
- **@aws-sdk/client-translate**: `3.1032.0` → `3.1100.0`
- **@google-cloud/translate**: `9.3.0` → `9.4.2`
- **@huggingface/inference**: `4.13.15` → `4.13.24`
- **@huggingface/transformers**: `4.1.0` → `4.2.0`
- **axios**: `1.15.0` → `1.19.0`
- **csv-parser**: `3.2.0` → `3.2.1`
- **deepl-node**: `1.26.0` → `1.27.0`
- **fast-xml-parser**: `5.7.1` → `5.10.1`
- **form-data**: `4.0.5` → `4.0.6`
- **gettext-parser**: `9.0.2` → `9.1.1`
- **js-yaml**: `4.1.1` → `4.3.1`
- **openai**: `6.34.0` → `7.3.0` (major)
- **sharp**: `0.34.5` → `0.35.3`
- **uuid**: `13.0.0` → `14.0.1` (major)
- **yargs**: `18.0.0` → `18.1.0`

#### Updated Dev Dependencies
- **@biomejs/biome**: `2.4.12` → `2.5.6`
- **@topce/native-preview**: `7.0.0-dev.20260215` → `7.0.3`
- **@types/node**: `25.6.0` → `26.1.2`
- **jest**: `30.3.0` → `30.4.2`
- **ts-jest**: `29.4.9` → `29.4.12`

#### Verification
- All 470 tests pass (12 suites)
- `npm pack --dry-run` succeeds (91 files, 100.7 kB packed)

## [2.2.0] - 2026-04-18

### 🔧 Dependency Updates & Bug Fixes

#### Updated Dependencies
- **@biomejs/biome**: bumped to `2.4.12`
- **@types/node**: bumped to `25.6.0`
- **ts-jest**: bumped to `29.4.9`
- **typescript**: bumped to `6.0.3`
- **@aws-sdk/client-translate**: bumped to `3.1032.0`
- **@huggingface/transformers**: bumped to `^4.1.0`
- **axios**: bumped to `1.15.0`
- **deepl-node**: bumped to `1.26.0`
- **dotenv**: bumped to `17.4.2`
- **fast-xml-parser**: bumped to `5.7.1`
- **openai**: bumped to `6.34.0`

#### Fixed
- **TypeScript**: Added `"jest"` and `"node"` to `types` in `tsconfig.json` so Jest globals (`describe`, `it`, `expect`) are correctly recognized
- **Jest config**: Added `moduleResolution: 'bundler'`, `rootDir: '.'`, and `ignoreDeprecations: '6.0'` to ts-jest tsconfig override to fix TS5011 and TS5107 errors in test runs
- All 470 tests pass

## [2.1.0] - 2026-03-22

### ⚡ Performance & CLI Improvements Release

#### Added
- **Lazy Loading**: Translation engines now load on-demand instead of at startup
- **JSON Output Mode**: New `--json` flag for structured, LLM-friendly output
- **Enhanced CLI Help**: Comprehensive examples and engine documentation
- **Performance Metrics**: Execution timing in JSON output for monitoring

#### Enhanced
- **CLI User Experience**: Better error messages with helpful tips and links
- **Engine Documentation**: All engines (huggingface, huggingface-local) fully documented
- **Local Inference Support**: Improved documentation for huggingface-local and Ollama
- **Developer Experience**: 15+ comprehensive usage examples added

#### Performance Improvements
- **Startup Time**: Reduced from ~500ms to ~27ms (library import)
- **Memory Footprint**: Only selected engine's SDK loads into memory
- **CLI Response**: Help/version commands don't trigger SDK loading
- **Engine Loading**: Each provider SDK loads only when first used

#### Technical Improvements
- **Provider Factory**: New `provider-factory.ts` with dynamic imports
- **Console Capture**: JSON output captures all logs, errors, and warnings
- **Error Handling**: Enhanced error messages with configuration guidance
- **Type Safety**: Maintained full TypeScript compatibility

#### Backward Compatibility
- ✅ All existing functionality preserved
- ✅ All 470 tests pass
- ✅ No breaking API changes
- ✅ Existing environment variables unchanged
- ✅ Demo scripts continue to work

### Migration Notes
- No migration required - fully backward compatible
- New `--json` flag available for automation workflows
- Performance benefits automatic (no configuration needed)
- Existing scripts continue to work unchanged

## [2.0.0] - 2025-01-04

### 🚀 Major Release - Complete Rewrite and Enhancement

#### Breaking Changes
- **ES Modules Migration**: Project now uses ES modules (`"type": "module"`) instead of CommonJS
- **Node.js Compatibility**: Requires Node.js with ES modules support
- **API Changes**: Some internal APIs may have changed due to the comprehensive refactoring

#### Added
- **Comprehensive Validation System**: New validation framework with enhanced error detection and recovery
  - `ValidationService` for centralized validation logic
  - `EnhancedValidationResult` with detailed error reporting
  - `ErrorRecovery` system for automatic error correction
  - Format-specific validation rules and error messages
- **Demo System**: Complete demo setup with example files and automation scripts
  - Interactive demo with multiple format examples
  - Reset and run scripts for easy testing
  - Sample files in JSON, XML, YAML, ARB, PO, Properties, and CSV formats
- **Enhanced Format Support**: Expanded format handlers with improved validation
  - Better ARB (Flutter) file handling with metadata preservation
  - Enhanced CSV/TSV support with configurable column mapping
  - Improved XLIFF 1.2 and 2.x support
  - Advanced PO/POT file handling with plural forms
  - Enhanced Properties file support with Unicode handling
  - Robust XML handling for Android, iOS, and generic formats
  - Comprehensive YAML support with nested structures
- **Advanced Testing Suite**: Extensive test coverage across all format handlers
  - Integration tests for CLI functionality
  - Error handling and edge case testing
  - Format-specific validation testing
  - Cross-format compatibility testing

#### Enhanced
- **Code Quality**: Complete codebase formatting and linting with Biome
  - Consistent code style across all modules
  - Enhanced TypeScript configurations
  - Improved error handling and type safety
- **CLI Interface**: Enhanced command-line interface with better error reporting
  - Improved argument parsing and validation
  - Better progress reporting and user feedback
  - Enhanced format detection and override capabilities
- **Performance**: Optimized file processing and translation workflows
  - Improved memory usage for large files
  - Better error recovery and continuation
  - Enhanced parallel processing capabilities
- **Documentation**: Updated examples and usage patterns throughout codebase

#### Fixed
- **Dependency Security**: Updated all dependencies to latest secure versions
  - Axios updated to 1.13.2 (from 1.12.1)
  - JWS updated to 4.0.1 (security fix)
  - All dev dependencies updated to latest versions
- **Format Handling**: Resolved various format-specific parsing and serialization issues
- **Error Handling**: Improved error messages and recovery mechanisms
- **Type Safety**: Enhanced TypeScript definitions and type checking

#### Technical Improvements
- **Module System**: Complete migration to ES modules with proper import/export syntax
- **Build System**: Updated build configuration for ES modules compatibility
- **Testing Framework**: Enhanced Jest configuration for ES modules support
- **Development Tools**: Improved development workflow with better tooling integration

### Migration Guide for v2.0.0
- Update Node.js to a version that supports ES modules
- Update import statements from `require()` to `import` syntax
- Review any custom integrations for API compatibility
- Test thoroughly with your specific file formats and workflows

## [1.5.5] - 2024-11-02

### Enhanced - XML Handler Improvements

#### Added
- **Enhanced Format Detection**: XML format detection now properly handles XML with attributes and namespaces (e.g., `<resources xmlns:android="...">`)
- **Generic XML Support**: Added support for generic XML formats with automatic structure flattening
  - Example: `<messages><greeting>Hello</greeting></messages>` becomes `messages.greeting: "Hello"`
- **Robust Validation**: Improved validation system that properly detects invalid Android/iOS XML structures
- **Malformed XML Detection**: Added validation for malformed XML with unclosed tags and proper error reporting

#### Fixed
- **XML Serialization**: Fixed iOS XML serialization to properly update translated values in plist structure
- **Validation Logic**: Fixed validation to correctly identify invalid XML structures instead of treating them as generic XML
- **Error Handling**: XML parser now properly throws errors for malformed XML content
- **Attribute Parsing**: Fixed parsing of XML elements with attributes like `translatable="false"`

#### Improved
- **Test Coverage**: All 40 XML handler tests now pass (100% success rate)
- **Android XML**: Enhanced support for resource groups and CDATA sections
- **iOS XML**: Improved plist format handling with proper key-value pair processing
- **Round-trip Translation**: Ensured translated content maintains XML structure integrity

### Technical Details
- Enhanced `detectXmlFormat()` to check both content and parsed structure
- Improved `transformGenericXml()` to properly flatten nested XML structures
- Added `validateXmlStructure()` for malformed XML detection
- Enhanced validation with `looksLikeAndroidXml()` and `looksLikeIosXml()` helpers
- Fixed `updateTranslatedValues()` for proper iOS plist serialization

## [Previous Versions]

### [1.5.4] and earlier
- Comprehensive multi-format support (JSON, XML, XLIFF, ARB, PO/POT, YAML, Properties, CSV/TSV)
- Multiple translation engine support (Google, AWS, Azure, DeepL, OpenAI)
- CLI interface with format detection
- Format-specific validation and error handling