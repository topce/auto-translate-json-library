// Export all format handlers and utilities

export * from "../format.interface.js";
export { FormatDetector } from "../format-detector.js";
export { FormatHandlerFactory } from "../format-handler-factory.js";
export { ArbHandler } from "./arb-handler.js";
export { CsvHandler } from "./csv-handler.js";
export { JsonHandler } from "./json-handler.js";
export { POHandler } from "./po-handler.js";
export * from "./po-utils.js";
export { POTHandler } from "./pot-handler.js";
export { PropertiesHandler } from "./properties-handler.js";
export { TsvHandler } from "./tsv-handler.js";
export { XliffHandler } from "./xliff-handler.js";
export { XmbHandler } from "./xmb-handler.js";
export { XmbXtbUtils } from "./xmb-xtb-utils.js";
export { XmlHandler } from "./xml-handler.js";
export { XtbHandler } from "./xtb-handler.js";
export { YamlHandler } from "./yaml-handler.js";

// Register default handlers
import { FormatHandlerFactory } from "../format-handler-factory.js";
import { ArbHandler } from "./arb-handler.js";
import { CsvHandler } from "./csv-handler.js";
import { JsonHandler } from "./json-handler.js";
import { POHandler } from "./po-handler.js";
import { POTHandler } from "./pot-handler.js";
import { PropertiesHandler } from "./properties-handler.js";
import { TsvHandler } from "./tsv-handler.js";
import { XliffHandler } from "./xliff-handler.js";
import { XmbHandler } from "./xmb-handler.js";
import { XmlHandler } from "./xml-handler.js";
import { XtbHandler } from "./xtb-handler.js";
import { YamlHandler } from "./yaml-handler.js";

// Auto-register handlers when this module is imported
FormatHandlerFactory.registerHandler("xml", new XmlHandler());
FormatHandlerFactory.registerHandler("android-xml", new XmlHandler());
FormatHandlerFactory.registerHandler("ios-xml", new XmlHandler());
FormatHandlerFactory.registerHandler("generic-xml", new XmlHandler());
FormatHandlerFactory.registerHandler("json", new JsonHandler());
FormatHandlerFactory.registerHandler("xliff", new XliffHandler());
FormatHandlerFactory.registerHandler("arb", new ArbHandler());
FormatHandlerFactory.registerHandler("xmb", new XmbHandler());
FormatHandlerFactory.registerHandler("xtb", new XtbHandler());
FormatHandlerFactory.registerHandler("po", new POHandler());
FormatHandlerFactory.registerHandler("pot", new POTHandler());
FormatHandlerFactory.registerHandler("yaml", new YamlHandler());
FormatHandlerFactory.registerHandler("properties", new PropertiesHandler());
FormatHandlerFactory.registerHandler("csv", new CsvHandler());
FormatHandlerFactory.registerHandler("tsv", new TsvHandler());
