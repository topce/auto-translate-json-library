import * as path from "node:path";
import type { 
  IFormatHandler, 
  FormatOptions, 
  ValidationResult, 
  EnhancedTranslationFile 
} from "../format.interface";
import type { TranslationFile } from "../translate.interface";

export interface CsvOptions extends FormatOptions {
  delimiter?: string;
  keyColumn?: string;
  valueColumn?: string;
  hasHeaders?: boolean;
  columns?: string[];
  multiLanguageColumns?: Record<string, string>; // language code -> column name mapping
  quote?: string;
  escape?: string;
  lineTerminator?: string;
  dialect?: 'excel' | 'unix' | 'rfc4180' | 'custom';
  skipEmptyLines?: boolean;
  trimFields?: boolean;
}

export class CsvHandler implements IFormatHandler {
  canHandle(filePath: string, content?: string): boolean {
    const extension = path.extname(filePath).toLowerCase();
    if (extension !== ".csv") {
      return false;
    }

    // If content is provided, do basic CSV validation
    if (content) {
      return this.isValidCsvContent(content);
    }

    return true;
  }

  parse(content: string, options?: CsvOptions): EnhancedTranslationFile {
    try {
      const delimiter = options?.delimiter || this.detectDelimiter(content);
      const csvOptions = this.getDialectOptions(options?.dialect, options);
      const rows = this.parseCSVContent(content, delimiter, csvOptions);
      return this.processRows(rows, delimiter, csvOptions);
    } catch (error) {
      throw new Error(`Failed to parse CSV: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  serialize(data: EnhancedTranslationFile, options?: CsvOptions): string {
    try {
      const { _metadata, ...cleanData } = data;
      const csvOptions = this.getDialectOptions(options?.dialect, { ..._metadata?.csvOptions, ...options });
      const delimiter = csvOptions.delimiter || _metadata?.csvDelimiter || ',';
      const lineTerminator = csvOptions.lineTerminator || '\n';
      
      // Determine columns and structure
      const columns = this.determineColumns(cleanData, _metadata, csvOptions);
      const records = this.createRecords(cleanData, columns, _metadata, csvOptions);
      
      // Create CSV content manually to avoid async complications
      let csvContent = '';
      
      // Add headers if needed
      if (csvOptions?.hasHeaders !== false && _metadata?.hasHeaders !== false) {
        csvContent += columns.map(col => 
          this.escapeField(col.title || col.id, delimiter, csvOptions)
        ).join(delimiter) + lineTerminator;
      }
      
      // Add data rows
      for (const record of records) {
        const row = columns.map(col => {
          const value = record[col.id] || '';
          return this.escapeField(String(value), delimiter, csvOptions);
        });
        csvContent += row.join(delimiter) + lineTerminator;
      }
      
      return csvContent;
    } catch (error) {
      throw new Error(`Failed to serialize CSV: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  getFileExtension(): string {
    return ".csv";
  }

  validateStructure(data: TranslationFile): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];

    // Basic structure validation
    if (!data || typeof data !== "object") {
      errors.push({
        code: "INVALID_STRUCTURE",
        message: "CSV data must be an object",
      });
      return { isValid: false, errors, warnings };
    }

    // Check for empty data
    const dataKeys = Object.keys(data).filter(key => !key.startsWith('_'));
    if (dataKeys.length === 0) {
      warnings.push({
        code: "EMPTY_CSV",
        message: "CSV file appears to be empty",
      });
    }

    // Validate that all values are strings (CSV requirement)
    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('_')) continue; // Skip metadata
      
      if (typeof value !== "string") {
        warnings.push({
          code: "NON_STRING_VALUE",
          message: `Value for key "${key}" is not a string: ${typeof value}`,
        });
      }
    }

    // Validate column configuration if metadata is available
    const metadata = (data as any)._metadata;
    if (metadata) {
      if (!metadata.keyColumn) {
        warnings.push({
          code: "MISSING_KEY_COLUMN",
          message: "No key column detected or specified",
        });
      }
      
      if (!metadata.valueColumn) {
        warnings.push({
          code: "MISSING_VALUE_COLUMN",
          message: "No value column detected or specified",
        });
      }
      
      if (metadata.columns && metadata.columns.length < 2) {
        warnings.push({
          code: "INSUFFICIENT_COLUMNS",
          message: "CSV should have at least 2 columns (key and value)",
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private getDialectOptions(dialect?: string, options?: CsvOptions): CsvOptions {
    const baseOptions = options || {};
    
    switch (dialect) {
      case 'excel':
        return {
          ...baseOptions,
          quote: '"',
          escape: '"',
          lineTerminator: '\r\n',
          trimFields: false,
        };
      case 'unix':
        return {
          ...baseOptions,
          quote: '"',
          escape: '\\',
          lineTerminator: '\n',
          trimFields: true,
        };
      case 'rfc4180':
        return {
          ...baseOptions,
          quote: '"',
          escape: '"',
          lineTerminator: '\r\n',
          trimFields: false,
        };
      default:
        return {
          quote: '"',
          escape: '"',
          lineTerminator: '\n',
          trimFields: true,
          ...baseOptions,
        };
    }
  }

  private isValidCsvContent(content: string): boolean {
    try {
      // Basic CSV validation - check for consistent delimiter usage
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length === 0) return false;
      
      const delimiter = this.detectDelimiter(content);
      const firstLineFields = this.parseCSVLine(lines[0], delimiter).length;
      
      // Check if most lines have consistent field count
      let consistentLines = 0;
      for (const line of lines.slice(0, Math.min(10, lines.length))) {
        const fields = this.parseCSVLine(line, delimiter);
        if (fields.length === firstLineFields) {
          consistentLines++;
        }
      }
      
      return consistentLines >= Math.ceil(lines.length * 0.7); // 70% consistency threshold
    } catch {
      return false;
    }
  }

  private detectDelimiter(content: string): string {
    const delimiters = [',', ';', '\t', '|'];
    const sample = content.split('\n').slice(0, 5).join('\n'); // Use first 5 lines for detection
    
    let bestDelimiter = ',';
    let maxConsistency = 0;
    
    for (const delimiter of delimiters) {
      const lines = sample.split('\n').filter(line => line.trim());
      if (lines.length < 2) continue;
      
      const fieldCounts = lines.map(line => this.parseCSVLine(line, delimiter).length);
      const firstCount = fieldCounts[0];
      const consistency = fieldCounts.filter(count => count === firstCount).length / fieldCounts.length;
      
      if (consistency > maxConsistency && firstCount > 1) {
        maxConsistency = consistency;
        bestDelimiter = delimiter;
      }
    }
    
    return bestDelimiter;
  }

  private parseCSVContent(content: string, delimiter: string, options?: CsvOptions): any[] {
    const lineTerminator = options?.lineTerminator || '\n';
    const skipEmptyLines = options?.skipEmptyLines !== false; // Default to true
    
    // Split by line terminator and optionally filter empty lines
    let lines = content.split(new RegExp(`\r?\n`));
    if (skipEmptyLines) {
      lines = lines.filter(line => line.trim());
    }
    
    if (lines.length === 0) {
      return [];
    }
    
    const hasHeaders = options?.hasHeaders !== false ? this.detectHeaders(lines, delimiter, options) : false;
    let headers: string[];
    let dataStartIndex: number;
    
    if (hasHeaders) {
      headers = this.parseCSVLine(lines[0], delimiter, options);
      dataStartIndex = 1;
    } else {
      // Generate column names if no headers detected
      const firstRowFields = this.parseCSVLine(lines[0], delimiter, options);
      headers = firstRowFields.map((_, index) => `column_${index + 1}`);
      dataStartIndex = 0;
    }
    
    const rows: any[] = [];
    
    for (let i = dataStartIndex; i < lines.length; i++) {
      const fields = this.parseCSVLine(lines[i], delimiter, options);
      const row: any = {};
      
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = fields[j] || '';
      }
      
      // Skip empty rows if option is set
      if (skipEmptyLines && Object.values(row).every(val => !val)) {
        continue;
      }
      
      rows.push(row);
    }
    
    return rows;
  }

  private parseCSVLine(line: string, delimiter: string, options?: CsvOptions): string[] {
    const quote = options?.quote || '"';
    const escape = options?.escape || quote; // Default escape is same as quote
    const trimFields = options?.trimFields !== false; // Default to true
    
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === quote) {
        if (inQuotes && nextChar === quote && escape === quote) {
          // Escaped quote (doubled quote)
          current += quote;
          i += 2;
        } else if (inQuotes && char === escape && nextChar === quote) {
          // Escaped quote (with escape character)
          current += quote;
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        // Field separator
        fields.push(trimFields ? current.trim() : current);
        current = '';
        i++;
      } else if (char === escape && nextChar && nextChar !== quote && inQuotes) {
        // Escape character for other characters
        current += nextChar;
        i += 2;
      } else {
        current += char;
        i++;
      }
    }
    
    fields.push(trimFields ? current.trim() : current);
    return fields;
  }

  private detectHeaders(lines: string[], delimiter: string, options?: CsvOptions): boolean {
    if (lines.length < 2) {
      return true; // Assume headers if only one line
    }
    
    const firstLine = this.parseCSVLine(lines[0], delimiter, options);
    const secondLine = this.parseCSVLine(lines[1], delimiter, options);
    
    // Check if first line contains typical header patterns
    const headerPatterns = [
      /^(key|id|identifier|name|string_id|message_id)$/i,
      /^(value|text|message|translation|content|string)$/i,
      /^(en|es|fr|de|it|pt|ru|zh|ja|ko|ar)$/i, // Language codes
      /^(source|target|original|translated)$/i,
    ];
    
    let headerScore = 0;
    let dataScore = 0;
    
    // Score first line as potential headers
    for (const field of firstLine) {
      if (headerPatterns.some(pattern => pattern.test(field))) {
        headerScore += 2;
      } else if (field && !this.looksLikeTranslatableText(field)) {
        headerScore += 1;
      }
    }
    
    // Score second line as potential data
    for (const field of secondLine) {
      if (this.looksLikeTranslatableText(field)) {
        dataScore += 2;
      } else if (field && field.length > 0) {
        dataScore += 1;
      }
    }
    
    // If first line looks more like headers and second line looks more like data
    return headerScore > dataScore || headerScore >= firstLine.length;
  }

  private looksLikeTranslatableText(text: string): boolean {
    if (!text || text.length === 0) return false;
    
    // Check for characteristics of translatable text
    const hasSpaces = text.includes(' ');
    const hasMultipleWords = text.split(/\s+/).length > 1;
    const hasCommonWords = /\b(the|and|or|in|on|at|to|for|of|with|by)\b/i.test(text);
    const isLongEnough = text.length > 10;
    const hasVariousChars = /[a-zA-Z].*[a-zA-Z]/.test(text);
    
    return (hasSpaces && hasMultipleWords) || hasCommonWords || (isLongEnough && hasVariousChars);
  }

  private validateDelimiterConsistency(lines: string[], delimiter: string): ValidationResult {
    const errors: any[] = [];
    const warnings: any[] = [];
    
    if (lines.length === 0) {
      errors.push({
        code: "EMPTY_FILE",
        message: "CSV file is empty",
      });
      return { isValid: false, errors, warnings };
    }
    
    const expectedFieldCount = this.parseCSVLine(lines[0], delimiter).length;
    let inconsistentLines = 0;
    
    for (let i = 1; i < lines.length; i++) {
      const fieldCount = this.parseCSVLine(lines[i], delimiter).length;
      if (fieldCount !== expectedFieldCount) {
        inconsistentLines++;
        if (inconsistentLines <= 3) { // Report first 3 inconsistencies
          warnings.push({
            code: "INCONSISTENT_FIELD_COUNT",
            message: `Line ${i + 1} has ${fieldCount} fields, expected ${expectedFieldCount}`,
            line: i + 1,
          });
        }
      }
    }
    
    if (inconsistentLines > lines.length * 0.3) { // More than 30% inconsistent
      errors.push({
        code: "MAJOR_STRUCTURE_INCONSISTENCY",
        message: `${inconsistentLines} out of ${lines.length} lines have inconsistent field counts`,
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private processRows(rows: any[], delimiter: string, options?: CsvOptions): EnhancedTranslationFile {
    if (rows.length === 0) {
      throw new Error("CSV file contains no data rows");
    }
    
    const firstRow = rows[0];
    const columns = Object.keys(firstRow);
    
    // Use provided columns or auto-detect
    const keyColumn = options?.keyColumn || this.detectKeyColumn(columns);
    if (!keyColumn) {
      throw new Error("Could not detect key column in CSV. Please specify keyColumn option.");
    }
    
    const valueColumn = options?.valueColumn || this.detectValueColumn(columns, keyColumn);
    if (!valueColumn) {
      throw new Error("Could not detect value column in CSV. Please specify valueColumn option.");
    }
    
    // Use provided multi-language columns or auto-detect
    const multiLanguageColumns = options?.multiLanguageColumns || this.detectMultiLanguageColumns(columns, keyColumn);
    
    // Process rows into translation data
    const translationData: Record<string, any> = {};
    const multiLanguageData: Record<string, Record<string, any>> = {};
    const originalRows: any[] = [];
    
    // Initialize multi-language data structure
    for (const [langCode, columnName] of Object.entries(multiLanguageColumns)) {
      multiLanguageData[langCode] = {};
    }
    
    for (const row of rows) {
      const key = row[keyColumn];
      const value = row[valueColumn];
      
      if (key && value !== undefined) {
        translationData[key] = value;
      }
      
      // Process multi-language columns
      for (const [langCode, columnName] of Object.entries(multiLanguageColumns)) {
        if (row[columnName] !== undefined && row[columnName] !== '') {
          multiLanguageData[langCode][key] = row[columnName];
        }
      }
      
      originalRows.push({ ...row });
    }
    
    const result: EnhancedTranslationFile = {
      ...translationData,
      _metadata: {
        format: "csv",
        csvDelimiter: delimiter,
        keyColumn,
        valueColumn,
        columns,
        multiLanguageColumns,
        multiLanguageData,
        hasHeaders: options?.hasHeaders !== false,
        originalRows,
        originalStructure: rows,
        csvOptions: options,
      }
    };
    
    return result;
  }

  private detectKeyColumn(columns: string[]): string | null {
    // Look for common key column names
    const keyPatterns = [
      /^key$/i,
      /^id$/i,
      /^identifier$/i,
      /^name$/i,
      /^string_id$/i,
      /^message_id$/i,
    ];
    
    for (const pattern of keyPatterns) {
      const match = columns.find(col => pattern.test(col));
      if (match) return match;
    }
    
    // Fallback to first column
    return columns[0] || null;
  }

  private detectMultiLanguageColumns(columns: string[], keyColumn: string): Record<string, string> {
    const multiLangColumns: Record<string, string> = {};
    
    // Common language code patterns
    const languagePatterns = [
      { pattern: /^(en|english)$/i, lang: 'en' },
      { pattern: /^(es|spanish|español)$/i, lang: 'es' },
      { pattern: /^(fr|french|français)$/i, lang: 'fr' },
      { pattern: /^(de|german|deutsch)$/i, lang: 'de' },
      { pattern: /^(it|italian|italiano)$/i, lang: 'it' },
      { pattern: /^(pt|portuguese|português)$/i, lang: 'pt' },
      { pattern: /^(ru|russian|русский)$/i, lang: 'ru' },
      { pattern: /^(zh|chinese|中文)$/i, lang: 'zh' },
      { pattern: /^(ja|japanese|日本語)$/i, lang: 'ja' },
      { pattern: /^(ko|korean|한국어)$/i, lang: 'ko' },
      { pattern: /^(ar|arabic|العربية)$/i, lang: 'ar' },
    ];
    
    // Check for language-specific columns
    for (const column of columns) {
      if (column === keyColumn) continue;
      
      for (const { pattern, lang } of languagePatterns) {
        if (pattern.test(column)) {
          multiLangColumns[lang] = column;
          break;
        }
      }
      
      // Also check for columns ending with language codes
      const langCodeMatch = column.match(/_([a-z]{2})$/i);
      if (langCodeMatch) {
        const langCode = langCodeMatch[1].toLowerCase();
        multiLangColumns[langCode] = column;
      }
    }
    
    return multiLangColumns;
  }

  private detectValueColumn(columns: string[], keyColumn: string): string | null {
    // Look for common value column names
    const valuePatterns = [
      /^value$/i,
      /^text$/i,
      /^message$/i,
      /^translation$/i,
      /^content$/i,
      /^string$/i,
    ];
    
    for (const pattern of valuePatterns) {
      const match = columns.find(col => pattern.test(col) && col !== keyColumn);
      if (match) return match;
    }
    
    // Fallback to second column or first non-key column
    const nonKeyColumns = columns.filter(col => col !== keyColumn);
    return nonKeyColumns[0] || null;
  }

  private determineColumns(data: Record<string, any>, metadata: any, options?: CsvOptions): Array<{id: string, title?: string}> {
    if (options?.columns) {
      return options.columns.map(col => ({ id: col, title: col }));
    }
    
    if (metadata?.columns) {
      return metadata.columns.map((col: string) => ({ id: col, title: col }));
    }
    
    // Build columns from key, value, and multi-language columns
    const columns: Array<{id: string, title?: string}> = [];
    
    const keyColumn = options?.keyColumn || metadata?.keyColumn || 'key';
    const valueColumn = options?.valueColumn || metadata?.valueColumn || 'value';
    
    columns.push({ id: keyColumn, title: keyColumn });
    columns.push({ id: valueColumn, title: valueColumn });
    
    // Add multi-language columns
    const multiLanguageColumns = options?.multiLanguageColumns || metadata?.multiLanguageColumns || {};
    for (const [langCode, columnName] of Object.entries(multiLanguageColumns)) {
      if (typeof columnName === 'string' && columnName !== keyColumn && columnName !== valueColumn) {
        columns.push({ id: columnName, title: columnName });
      }
    }
    
    return columns;
  }

  private createRecords(data: Record<string, any>, columns: Array<{id: string, title?: string}>, metadata: any, options?: CsvOptions): Record<string, any>[] {
    if (metadata?.originalRows) {
      // Update original rows with translated data and multi-language data
      const keyColumn = metadata.keyColumn;
      const valueColumn = metadata.valueColumn;
      const multiLanguageData = metadata.multiLanguageData || {};
      
      return metadata.originalRows.map((row: any) => {
        const key = row[keyColumn];
        const updatedRow = { ...row };
        
        // Update main translation
        if (key && data[key] !== undefined) {
          updatedRow[valueColumn] = data[key];
        }
        
        // Update multi-language columns
        for (const [langCode, langData] of Object.entries(multiLanguageData)) {
          const columnName = metadata.multiLanguageColumns?.[langCode];
          if (columnName && (langData as any)[key] !== undefined) {
            updatedRow[columnName] = (langData as any)[key];
          }
        }
        
        return updatedRow;
      });
    }
    
    // Create new records from flat data
    const keyColumn = options?.keyColumn || columns[0]?.id || 'key';
    const valueColumn = options?.valueColumn || columns[1]?.id || 'value';
    
    const records = Object.entries(data).map(([key, value]) => ({
      [keyColumn]: key,
      [valueColumn]: value
    }));
    
    // Add multi-language columns if specified
    if (options?.multiLanguageColumns && metadata?.multiLanguageData) {
      for (const record of records) {
        const key = record[keyColumn];
        for (const [langCode, columnName] of Object.entries(options.multiLanguageColumns)) {
          const langData = metadata.multiLanguageData[langCode];
          if (langData && langData[key] !== undefined) {
            record[columnName] = langData[key];
          }
        }
      }
    }
    
    return records;
  }

  private escapeField(field: string, delimiter: string, options?: CsvOptions): string {
    const quote = options?.quote || '"';
    const escape = options?.escape || quote;
    const lineTerminator = options?.lineTerminator || '\n';
    
    // Check if field needs quoting
    const needsQuoting = field.includes(delimiter) || 
                        field.includes(quote) || 
                        field.includes('\n') || 
                        field.includes('\r') ||
                        field.includes(lineTerminator) ||
                        (field.startsWith(' ') || field.endsWith(' ')); // Leading/trailing spaces
    
    if (!needsQuoting) {
      return field;
    }
    
    // Escape quotes based on escape character
    let escaped: string;
    if (escape === quote) {
      // Double the quote character (Excel style)
      escaped = field.replace(new RegExp(quote, 'g'), quote + quote);
    } else {
      // Use escape character (Unix style)
      escaped = field.replace(new RegExp(`[${quote}${escape}]`, 'g'), escape + '$&');
    }
    
    return `${quote}${escaped}${quote}`;
  }
}