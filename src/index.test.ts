import { encode, decode, count } from './index';

test('encode function', () => {
  const input = 'This is a test.';
  const expectedOutput = [1212, 318, 257, 1332, 13];
  expect(encode(input)).toEqual(expectedOutput);
});

test('decode function', () => {
  const input = [1212, 318, 257, 1332, 13];
  const expectedOutput = 'This is a test.';
  expect(decode(input)).toEqual(expectedOutput);
});

test('encode and decode are reversible', () => {
  const input = 'The quick brown fox jumps over the lazy dog.';
  const encoded = encode(input);
  const decoded = decode(encoded);
  expect(decoded).toEqual(input);
});

test('countTokens function', () => {
  const input = 'This is another test.';
  const expectedOutput = 5;
  expect(count(input)).toEqual(expectedOutput);
});
