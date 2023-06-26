import { Util } from "../src/util";


describe('Util', () => {
  describe('replaceArgumentsWithNumbers', () => {
    it('should replace placeholders with arguments', (cb_) => {
      const args: RegExpMatchArray = ['John', 'Doe'];
      const result = Util.replaceArgumentsWithNumbers(args, 'Hello {0}, my name is {1}.');
      expect(result).toBe('Hello John, my name is Doe.');
    });

    it('should return the same result if no arguments provided', (cb_) => {
      const args: RegExpMatchArray | null = null;
      const result = Util.replaceArgumentsWithNumbers(args, 'Hello {0}, my name is {1}.');
      expect(result).toBe('Hello {0}, my name is {1}.');
    });
  });

  describe('replaceContextVariables', () => {
    it('should replace placeholders with numerical indices', (cb_) => {
      Util.startDelimiter = '{{';
      Util.endDelimiter = '}}';

      const text = 'Hello {{name}}, my age is {{age}}.';
      const { args, text: replacedText } = Util.replaceContextVariables(text);
      expect(args).toEqual(['{{name}}', '{{age}}']);
      expect(replacedText).toBe('Hello {{0}}, my age is {{1}}.');
    });

    it('should return the same text if no placeholders found', (cb_) => {
      Util.startDelimiter = '{{';
      Util.endDelimiter = '}}';

      const text = 'Hello, my name is John.';
      const { args, text: replacedText } = Util.replaceContextVariables(text);
      expect(args).toBeNull();
      expect(replacedText).toBe('Hello, my name is John.');
    });
  });
});
