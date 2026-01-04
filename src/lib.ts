// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import { AWSTranslate } from "./aws";
import { AzureTranslate } from "./azure";
import type { Configuration } from "./config";
import { DeepLTranslate } from "./deepl";
import { Files, type IFiles } from "./files";
import { FolderFiles } from "./folderFiles";
import { GoogleTranslate } from "./google";
import { OpenAITranslate } from "./openai";
import type { ITranslate, TranslationFile } from "./translate.interface";
import { Util } from "./util";

export async function translate(
  sourceFile: string,
  config: Configuration,
): Promise<void> {
  // set the delimiters for named arguments
  const startDelimiter = config.startDelimiter || "{";
  if (startDelimiter) {
    Util.startDelimiter = startDelimiter;
  }

  const endDelimiter = config.endDelimiter || "}";
  if (endDelimiter) {
    Util.endDelimiter = endDelimiter;
  }

  let translateEngine: ITranslate;

  if (config.translationKeyInfo.kind === "google") {
    translateEngine = await GoogleTranslate.initialize(
      config.translationKeyInfo.apiKey,
    );
  } else if (config.translationKeyInfo.kind === "aws") {
    translateEngine = new AWSTranslate(
      config.translationKeyInfo.accessKeyId,
      config.translationKeyInfo.secretAccessKey,
      config.translationKeyInfo.region,
    );
  } else if (config.translationKeyInfo.kind === "azure") {
    translateEngine = new AzureTranslate(
      config.translationKeyInfo.secretKey,
      config.translationKeyInfo.region,
    );
  } else if (config.translationKeyInfo.kind === "deepLFree") {
    translateEngine = new DeepLTranslate(
      config.translationKeyInfo.secretKey,
      "free",
    );
  } else if (config.translationKeyInfo.kind === "deepLPro") {
    translateEngine = new DeepLTranslate(
      config.translationKeyInfo.secretKey,
      "pro",
    );
  } else if (config.translationKeyInfo.kind === "openai") {
    translateEngine = new OpenAITranslate(
      config.translationKeyInfo.apiKey,
      config.translationKeyInfo.baseUrl,
      config.translationKeyInfo.model,
      config.translationKeyInfo.maxTokens,
      config.translationKeyInfo.temperature,
      config.translationKeyInfo.topP,
      config.translationKeyInfo.n,
      config.translationKeyInfo.presencePenalty,
      config.translationKeyInfo.frequencyPenalty,
    );
  } else {
    console.warn(
      "You must provide a Google, AWS, Azure, deepL, openai parameters first in the extension settings.",
    );
    return;
  }

  const fileMode = config.mode ?? "file";
  const files = readFiles(sourceFile, fileMode, config.format);
  if (files === null) {
    return;
  }

  // enforce source locale if provided in settings
  if (config.sourceLocale !== files.sourceLocale) {
    console.log(
      `You must use the ${config.sourceLocale} file (matching extension) due to your Source Locale setting.`,
    );
    return;
  }

  const keepTranslations = config.keepTranslations === "keep";
  const keepExtras = config.keepExtraTranslations === "keep";

  // load source JSON
  let source: TranslationFile;
  try {
    console.log(`📖 Loading source file for locale '${files.sourceLocale}'...`);
    source = await files.loadJsonFromLocale(files.sourceLocale);
    console.log(`✅ Successfully loaded source file`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Source file malformed: ${error.message}`);
    }
    return;
  }

  // Iterate target Locales
  console.log(`🌍 Processing ${files.targetLocales.length} target locale(s)...`);

  for (let i = 0; i < files.targetLocales.length; i++) {
    const targetLocale = files.targetLocales[i];
    try {
      console.log(`🔄 [${i + 1}/${files.targetLocales.length}] Processing locale '${targetLocale}'...`);

      const isValid = await translateEngine.isValidLocale(targetLocale);
      if (!isValid) {
        console.warn(`⚠️  Locale '${targetLocale}' is not supported by ${config.translationKeyInfo.kind}. Skipping.`);
        continue;
      }

      console.log(`📖 Loading existing translations for '${targetLocale}'...`);
      const targetOriginal = await files.loadJsonFromLocale(targetLocale);

      console.log(`🔤 Translating content from '${files.sourceLocale}' to '${targetLocale}'...`);
      // Iterate source terms
      const targetNew = await recurseNode(
        source,
        targetOriginal,
        keepTranslations,
        keepExtras,
        files.sourceLocale,
        targetLocale,
        translateEngine,
        config.ignorePrefix,
      );

      console.log(`💾 Saving translations for '${targetLocale}'...`);
      // save target
      files.saveJsonToLocale(targetLocale, targetNew);

      console.log(`✅ Successfully translated locale '${targetLocale}'`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`❌ Error processing locale '${targetLocale}': ${error.message}`);
        // Continue with other locales instead of stopping completely
        continue;
      }
      return;
    }
  }

  console.log(`🎉 Translation completed for all locales!`);
}

const readFiles: (filePath: string, mode: "file" | "folder", format?: string) => IFiles | null =
  (filePath: string, mode: string, format?: string) => {
    try {
      const files: IFiles =
        mode === "file" ? new Files(filePath, format) : new FolderFiles(filePath, format);

      // log locale info
      console.log(`Source locale = ${files.sourceLocale}`);
      console.log(`Target locales = ${files.targetLocales}`);

      // Log format information for better user feedback
      if (files.getDetectedFormat && files.getFormatOverride) {
        const detectedFormat = files.getDetectedFormat();
        const formatOverride = files.getFormatOverride();

        if (formatOverride) {
          console.log(`Format override = ${formatOverride}`);
        } else if (detectedFormat) {
          console.log(`Detected format = ${detectedFormat}`);
        }
      }

      return files;
    } catch (error) {
      if (error instanceof Error) {
        console.error(error);
      }
      return null;
    }
  };

async function recurseNode(
  source: TranslationFile,
  original: TranslationFile,
  keepTranslations: boolean | null,
  keepExtras: boolean | null,
  sourceLocale: string,
  locale: string,
  translateEngine: ITranslate,
  ignorePrefix = "",
  isArray = false,
): Promise<TranslationFile> {
  // biome-ignore lint/suspicious/noExplicitAny: array and object types are used for flexibility
  const destination: any = isArray ? [] : {};

  // defaults
  if (keepTranslations === null) {
    keepTranslations = true;
  }
  if (keepExtras === null) {
    keepExtras = true;
  }

  for (const term in source) {
    const node = source[term];
    const isXmlNodeLike =
      typeof source === "object" &&
      source !== null &&
      Object.keys(source).some((k) => k === "#text" || k.startsWith("@_"));

    // Handle metadata specially to prevent translation and ensure correctness
    if (term === "_metadata") {
      // Start with original metadata or clone source metadata
      destination[term] = original[term] ? JSON.parse(JSON.stringify(original[term])) : JSON.parse(JSON.stringify(node));

      // If ARB format, ensure @@locale matches the target locale
      if (destination[term]?.arbMetadata) {
        destination[term].arbMetadata["@@locale"] = locale;
      }
      continue;
    }

    if (node instanceof Object && node !== null) {
      destination[term] = await recurseNode(
        node,
        original[term] ?? {},
        keepTranslations,
        keepExtras,
        sourceLocale,
        locale,
        translateEngine,
        ignorePrefix,
        Array.isArray(node),
      );
    } else {
      // For XML: do not translate attributes (fast-xml-parser uses "@_" prefix)
      if (term.startsWith("@_")) {
        destination[term] = original[term] ?? node;
        continue;
      }

      // For XML-like nodes: only translate text content (#text), skip other keys
      if (isXmlNodeLike && term !== "#text") {
        destination[term] = original[term] ?? node;
        continue;
      }

      // Skip translation for empty/whitespace-only text
      if (term === "#text" && typeof node === "string" && node.trim().length === 0) {
        destination[term] = original[term] ?? node;
        continue;
      }
      // if we already have a translation, keep it
      if (keepTranslations && original[term]) {
        destination[term] = original[term];
      } else if (typeof node === "number" || typeof node === "boolean") {
        // numbers and booleans do not need translations
        destination[term] = node;
      } else {
        // Only translate non-empty strings
        if (typeof node !== "string") {
          destination[term] = original[term] ?? node;
          continue;
        }

        const textValue = node.trim();
        if (textValue.length === 0) {
          destination[term] = original[term] ?? node;
          continue;
        }

        if (ignorePrefix === "" || (ignorePrefix !== "" && !term.startsWith(ignorePrefix))) {
          // Extract context if available (e.g. from ARB metadata)
          let context: string | undefined;
          // @ts-ignore: _metadata is loosely typed
          if (source._metadata?.resourceMetadata?.[`@${term}`]) {
            // @ts-ignore
            const meta = source._metadata.resourceMetadata[`@${term}`];
            context = meta.description || meta.context;
          }

          const translation = await translateEngine
            .translateText(textValue, sourceLocale, locale, context)
            .catch((err) => console.error(err));
          destination[term] = translation ?? textValue;
        } else {
          delete destination[term];
        }
      }
    }
  }

  if (keepExtras) {
    // add back in any terms that were not in source
    for (const term in original) {
      if (!destination[term]) {
        destination[term] = original[term];
      }
    }
  }

  return destination;
}
