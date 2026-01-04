# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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