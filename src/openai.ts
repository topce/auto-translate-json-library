import { OpenAI } from "openai";
import { ITranslate } from "./translate.interface";
import { Util } from "./util";

const supportedLanguages: { [key: string]: string } = {
  af: "Afrikaans",
  sq: "Albanian",
  am: "Amharic",
  ar: "Arabic",
  hy: "Armenian",
  az: "Azerbaijani",
  eu: "Basque",
  be: "Belarusian",
  bn: "Bengali",
  bs: "Bosnian",
  bg: "Bulgarian",
  ca: "Catalan",
  ceb: "Cebuano",
  "zh-CN": "Chinese (Simplified)",
  "zh-TW": "Chinese (Traditional)",
  co: "Corsican",
  hr: "Croatian",
  cs: "Czech",
  da: "Danish",
  nl: "Dutch",
  en: "English",
  eo: "Esperanto",
  et: "Estonian",
  fi: "Finnish",
  fr: "French",
  fy: "Frisian",
  gl: "Galician",
  ka: "Georgian",
  de: "German",
  el: "Greek",
  gu: "Gujarati",
  ht: "Haitian Creole",
  ha: "Hausa",
  haw: "Hawaiian",
  he: "Hebrew",
  hi: "Hindi",
  hmn: "Hmong",
  hu: "Hungarian",
  is: "Icelandic",
  ig: "Igbo",
  id: "Indonesian",
  ga: "Irish",
  it: "Italian",
  ja: "Japanese",
  jv: "Javanese",
  kn: "Kannada",
  kk: "Kazakh",
  km: "Khmer",
  ko: "Korean",
  ku: "Kurdish",
  ky: "Kyrgyz",
  lo: "Lao",
  la: "Latin",
  lv: "Latvian",
  lt: "Lithuanian",
  lb: "Luxembourgish",
  mk: "Macedonian",
  mg: "Malagasy",
  ms: "Malay",
  ml: "Malayalam",
  mt: "Maltese",
  mi: "Maori",
  mr: "Marathi",
  mn: "Mongolian",
  my: "Myanmar (Burmese)",
  ne: "Nepali",
  no: "Norwegian",
  ny: "Nyanja (Chichewa)",
  or: "Odia (Oriya)",
  ps: "Pashto",
  fa: "Persian",
  pl: "Polish",
  pt: "Portuguese",
  pa: "Punjabi",
  ro: "Romanian",
  ru: "Russian",
  sm: "Samoan",
  gd: "Scots Gaelic",
  sr: "Serbian",
  st: "Sesotho",
  sn: "Shona",
  sd: "Sindhi",
  si: "Sinhala (Sinhalese)",
  sk: "Slovak",
  sl: "Slovenian",
  so: "Somali",
  es: "Spanish",
  su: "Sundanese",
  sw: "Swahili",
  sv: "Swedish",
  tl: "Tagalog (Filipino)",
  tg: "Tajik",
  ta: "Tamil",
  tt: "Tatar",
  te: "Telugu",
  th: "Thai",
  tr: "Turkish",
  tk: "Turkmen",
  uk: "Ukrainian",
  ur: "Urdu",
  ug: "Uyghur",
  uz: "Uzbek",
  vi: "Vietnamese",
  cy: "Welsh",
  xh: "Xhosa",
  yi: "Yiddish",
  yo: "Yoruba",
  zu: "Zulu",
};

export class OpenAITranslate implements ITranslate {
  private openai;
  constructor(apiKey: string) {
    const configuration = {
      apiKey: apiKey,
    };
    this.openai = new OpenAI(configuration);
  }
  isValidLocale(targetLocale: string): boolean {
    return targetLocale in supportedLanguages;
  }
  async translateText(
    text: string,
    sourceLocale: string,
    targetLocale: string,
  ): Promise<string> {
    if (sourceLocale !== "en") {
      throw Error(
        `${sourceLocale} is not supported.Currently we support just English `,
      );
    }

    let result = "";
    let args;
    ({ args, text } = Util.replaceContextVariables(text));
    const systemPrompt = `You will be provided with a sentence in English, and your task is to translate it into  ${
      supportedLanguages[targetLocale] as string
    }`;
    const userPrompt = text;
    const response = await this.openai.chat.completions.create({
      model: "text-davinci-003",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0,
      max_tokens: 250,
      top_p: 1.0,
      n: 1,
      frequency_penalty: 0.0,
      presence_penalty: 0.0,
    });

    if (response.choices[0].message.content !== null) {
      result = Util.replaceArgumentsWithNumbers(
        args,
        response.choices[0].message.content,
      );
      result = result.replace(/^\n+|\n+$/g, "");
    } else {
      console.error(`can not translate text with 
      system prompt : ${systemPrompt} 
      and 
      user prompt : ${userPrompt} `);
      result = Util.replaceArgumentsWithNumbers(args, result);
    }
    return result;
  }
}
