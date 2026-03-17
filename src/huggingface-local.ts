import type { ITranslate } from "./translate.interface.js";
import { Util } from "./util.js";

const supportedLanguages: Record<string, string> = {
    en: "English",
    fr: "French",
    de: "German",
    es: "Spanish",
    it: "Italian",
    pt: "Portuguese",
    nl: "Dutch",
    pl: "Polish",
    cs: "Czech",
    sk: "Slovak",
    sl: "Slovenian",
    hr: "Croatian",
    hu: "Hungarian",
    ro: "Romanian",
    bg: "Bulgarian",
    el: "Greek",
    ru: "Russian",
    uk: "Ukrainian",
    tr: "Turkish",
    ar: "Arabic",
    he: "Hebrew",
    hi: "Hindi",
    th: "Thai",
    vi: "Vietnamese",
    id: "Indonesian",
    ms: "Malay",
    ja: "Japanese",
    ko: "Korean",
    "zh-CN": "Chinese (Simplified)",
    "zh-TW": "Chinese (Traditional)",
};

export class HuggingFaceLocalTranslate implements ITranslate {
    private pipelinePromise: Promise<any> | null = null;

    constructor(private model: string) { }

    isValidLocale(_targetLocale: string): boolean {
        // Local ONNX models support many locales; validation happens at runtime
        return true;
    }

    private async getPipeline(): Promise<any> {
        if (!this.pipelinePromise) {
            // Dynamically import to avoid issues when the package is not installed
            const { pipeline } = await import("@huggingface/transformers");
            this.pipelinePromise = pipeline("translation", this.model);
        }
        return this.pipelinePromise;
    }

    private sanitizeResult(result: string, args: RegExpMatchArray | null): string {
        return Util.replaceArgumentsWithNumbers(args, result.replace(/^\n+|\n+$/g, "").trim());
    }

    private async translateWithTranslationPipeline(
        text: string,
        sourceLocale: string,
        targetLocale: string,
        args: RegExpMatchArray | null,
    ): Promise<string> {
        const translator = await this.getPipeline();

        const output = await translator(text, {
            src_lang: sourceLocale,
            tgt_lang: targetLocale,
        });

        const result = Array.isArray(output) && output.length > 0
            ? (output[0] as { translation_text: string }).translation_text
            : (output as { translation_text: string }).translation_text;

        return this.sanitizeResult(result, args);
    }

    async translateText(
        text: string,
        sourceLocale: string,
        targetLocale: string,
        _context?: string,
    ): Promise<string> {
        let args: RegExpMatchArray | null;
        ({ args, text } = Util.replaceContextVariables(text));

        return this.translateWithTranslationPipeline(
            text,
            sourceLocale,
            targetLocale,
            args,
        );
    }
}
