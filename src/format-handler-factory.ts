import type { IFormatHandler } from "./format.interface";

export class FormatHandlerFactory {
  private static handlers: Map<string, IFormatHandler> = new Map();

  static registerHandler(format: string, handler: IFormatHandler): void {
    this.handlers.set(format, handler);
  }

  static getHandler(format: string): IFormatHandler | undefined {
    return this.handlers.get(format);
  }

  static getSupportedFormats(): string[] {
    return Array.from(this.handlers.keys());
  }

  static hasHandler(format: string): boolean {
    return this.handlers.has(format);
  }

  static getAllHandlers(): Map<string, IFormatHandler> {
    return new Map(this.handlers);
  }
}