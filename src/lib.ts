// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { Files, IFiles } from './files';
import { FolderFiles } from './folderFiles';

import { AWSTranslate } from './aws';
import { AzureTranslate } from './azure';
import { GoogleTranslate } from './google';
import { ITranslate } from './translate.interface';
import { Util } from './util';
import { DeepLTranslate } from './deepl';
import { Configuration } from './config';

const NAME = 'AutoTranslateJSON';

export async function translate(sourceFile: string ,config: Configuration  ): Promise<void> {
      

      // set the delimiters for named arguments
      const startDelimiter = config.startDelimiter || '{';
      if (startDelimiter) {
        Util.startDelimiter = startDelimiter;
      }

      const endDelimiter = config.endDelimiter || '}';
      if (endDelimiter) {
        Util.endDelimiter = endDelimiter;
      }

      let translateEngine: ITranslate;

      if (config.translationKeyInfo.kind === 'google') {
        translateEngine = new GoogleTranslate(config.translationKeyInfo.apiKey);
      } else if (config.translationKeyInfo.kind === 'aws') {
        translateEngine = new AWSTranslate(
          config.translationKeyInfo.accessKeyId,
          config.translationKeyInfo.secretAccessKey,
          config.translationKeyInfo.region
        );
      } else if (config.translationKeyInfo.kind==='azure') {
        translateEngine = new AzureTranslate(config.translationKeyInfo.secretKey, config.translationKeyInfo.region);
      } else if (config.translationKeyInfo.kind==='deepLFree') {
        translateEngine = new DeepLTranslate(config.translationKeyInfo.secretKey, 'free');
      } else if (config.translationKeyInfo.kind==='deepLPro') {
        translateEngine = new DeepLTranslate(config.translationKeyInfo.secretKey, 'pro');
      } else {
        console.warn(
          'You must provide a Google, AWS or Azure parameters first in the extension settings.'
        );
        return;
      }

  
      const fileMode =config.mode;
      const files = readFiles(sourceFile, fileMode);
      if (files === null) {
        return;
      }

      // enforce source locale if provided in settings
      if (config.sourceLocale !== files.sourceLocale) {
        console.log(
          'You must use the ' +
          config.sourceLocale +
            '.json file due to your Source Locale setting.'
        );
        return;
      }

      const keepTranslations = config.keepTranslations === 'keep';
      const keepExtras = config.keepExtraTranslations === 'keep';

      // load source JSON
      let source: any;
      try {
        source = await files.loadJsonFromLocale(files.sourceLocale);
      } catch (error) {
        if (error instanceof Error) {
          console.log(error, 'Source file malformed');
        }
        return;
      }

      // Iterate target Locales
      files.targetLocales.forEach(async (targetLocale) => {
        try {
          const isValid = await translateEngine.isValidLocale(targetLocale);
          if (!isValid) {
            throw Error(targetLocale + ' is not supported. Skipping.');
          }

          const targetOriginal = await files.loadJsonFromLocale(targetLocale);

          // Iterate source terms
          const targetNew = await recurseNode(
            source,
            targetOriginal,
            keepTranslations,
            keepExtras,
            files.sourceLocale,
            targetLocale,
            translateEngine
          );

          // save target
          files.saveJsonToLocale(targetLocale, targetNew);

          const feedback = "Translated locale '" + targetLocale + "'";
          console.log(feedback);
          
        } catch (error) {
          if (error instanceof Error) {
            console.error(error);
          }
          return;
        }
      });
    }


  const readFiles: (
    filePath: string,
    mode: 'file' | 'folder'
  ) => IFiles | null = (filePath: string, mode: string) => {
    try {
      const files: IFiles =
        mode === 'file' ? new Files(filePath) : new FolderFiles(filePath);

      // log locale info
      console.log('Source locale = ' + files.sourceLocale);
      console.log('Target locales = ' + files.targetLocales);

      return files;
    } catch (error) {
      if (error instanceof Error) {
        console.error(error);
      }
      return null;
    }
  };

  async function recurseNode(
    source: any,
    original: any,
    keepTranslations: boolean | null,
    keepExtras: boolean | null,
    sourceLocale: string,
    locale: string,
    translateEngine: ITranslate,
    isArray: boolean = false
  ): Promise<any> {
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

      if (node instanceof Object && node !== null) {
        destination[term] = await recurseNode(
          node,
          original[term] ?? {},
          keepTranslations,
          keepExtras,
          sourceLocale,
          locale,
          translateEngine,
          node instanceof Array
        );
      } else {
        // if we already have a translation, keep it
        if (keepTranslations && original[term]) {
          destination[term] = original[term];
        } else if (typeof node === 'number' || typeof node === 'boolean') {
          // numbers and booleans do not need translations
          destination[term] = node;
        } else {
          const translation = await translateEngine
            .translateText(node, sourceLocale, locale)
            .catch((err) =>console.error(err));
          destination[term] = translation;
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


