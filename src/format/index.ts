// Export all format handlers and utilities
export { XmlHandler } from "./xml-handler";
export { JsonHandler } from "./json-handler";
export { XliffHandler } from "./xliff-handler";
export { ArbHandler } from "./arb-handler";
export { XmbHandler } from "./xmb-handler";
export { XtbHandler } from "./xtb-handler";
export { XmbXtbUtils } from "./xmb-xtb-utils";
export { POHandler } from "./po-handler";
export { POTHandler } from "./pot-handler";
export { YamlHandler } from "./yaml-handler";
export { PropertiesHandler } from "./properties-handler";
export { CsvHandler } from "./csv-handler";
export { TsvHandler } from "./tsv-handler";
export * from "./po-utils";
export * from "../format.interface";
export { FormatDetector } from "../format-detector";
export { FormatHandlerFactory } from "../format-handler-factory";

// Register default handlers
import { FormatHandlerFactory } from "../format-handler-factory";
import { XmlHandler } from "./xml-handler";
import { JsonHandler } from "./json-handler";
import { XliffHandler } from "./xliff-handler";
import { ArbHandler } from "./arb-handler";
import { XmbHandler } from "./xmb-handler";
import { XtbHandler } from "./xtb-handler";
import { POHandler } from "./po-handler";
import { POTHandler } from "./pot-handler";
import { YamlHandler } from "./yaml-handler";
import { PropertiesHandler } from "./properties-handler";
import { CsvHandler } from "./csv-handler";
import { TsvHandler } from "./tsv-handler";

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