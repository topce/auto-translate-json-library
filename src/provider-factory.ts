import type { Configuration } from "./config.js";
import type { ITranslate } from "./translate.interface.js";

export async function createTranslateEngine(
  config: Configuration,
): Promise<ITranslate> {
  const { translationKeyInfo } = config;

  if (translationKeyInfo.kind === "google") {
    const { GoogleTranslate } = await import("./google.js");
    return GoogleTranslate.initialize(translationKeyInfo.apiKey);
  } else if (translationKeyInfo.kind === "aws") {
    const { AWSTranslate } = await import("./aws.js");
    return new AWSTranslate(
      translationKeyInfo.accessKeyId,
      translationKeyInfo.secretAccessKey,
      translationKeyInfo.region,
    );
  } else if (translationKeyInfo.kind === "azure") {
    const { AzureTranslate } = await import("./azure.js");
    return new AzureTranslate(
      translationKeyInfo.secretKey,
      translationKeyInfo.region,
    );
  } else if (translationKeyInfo.kind === "deepLFree") {
    const { DeepLTranslate } = await import("./deepl.js");
    return new DeepLTranslate(translationKeyInfo.secretKey, "free");
  } else if (translationKeyInfo.kind === "deepLPro") {
    const { DeepLTranslate } = await import("./deepl.js");
    return new DeepLTranslate(translationKeyInfo.secretKey, "pro");
  } else if (translationKeyInfo.kind === "openai") {
    const { OpenAITranslate } = await import("./openai.js");
    return new OpenAITranslate(
      translationKeyInfo.apiKey,
      translationKeyInfo.baseUrl,
      translationKeyInfo.model,
      translationKeyInfo.maxTokens,
      translationKeyInfo.temperature,
      translationKeyInfo.topP,
      translationKeyInfo.n,
      translationKeyInfo.presencePenalty,
      translationKeyInfo.frequencyPenalty,
    );
  } else if (translationKeyInfo.kind === "huggingface") {
    const { HuggingFaceTranslate } = await import("./huggingface.js");
    return new HuggingFaceTranslate(
      translationKeyInfo.apiKey,
      translationKeyInfo.model,
      translationKeyInfo.provider,
    );
  } else if (translationKeyInfo.kind === "huggingface-local") {
    const { HuggingFaceLocalTranslate } = await import(
      "./huggingface-local.js"
    );
    return new HuggingFaceLocalTranslate(translationKeyInfo.model);
  } else {
    throw new Error(
      "You must provide a Google, AWS, Azure, deepL, openai, huggingface, or huggingface-local parameters first in the extension settings.",
    );
  }
}
