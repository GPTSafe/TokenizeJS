// This file includes code which was modified from https://github.com/openai/gpt-2
// This file inclused code which was modified from https://github.com/NickHeiner/GPT-3-Encoder

import * as fs from 'fs';
import * as path from 'path';

const encoder = JSON.parse(
  fs.readFileSync(path.join(__dirname, './encoder.json'), 'utf-8')
);
const bpe_file: string = fs.readFileSync(
  path.join(__dirname, './vocab.bpe'),
  'utf-8'
);

const pat =
  /'s|'t|'re|'ve|'m|'ll|'d| ?\p{L}+| ?\p{N}+| ?[^\s\p{L}\p{N}]+|\s+(?!\S)|\s+/gu;

function range(x: number, y: number): number[] {
  const res: number[] = Array.from(Array(y).keys()).slice(x);
  return res;
}

const ord = (x: string): number => {
  return x.charCodeAt(0);
};

const chr = (x: number): string => {
  return String.fromCharCode(x);
};

const textEncoder = new TextEncoder();
const encodeStr = (str: string): string[] => {
  return Array.from(textEncoder.encode(str)).map(x => x.toString());
};

function dictZip<T, U>(x: T[], y: U[]): Record<string, U> {
  const result: Record<string, U> = {};
  x.map((_, i) => {
    result[String(x[i])] = y[i];
  });
  return result;
}

function bytes_to_unicode(): { [key: number]: string } {
  const bs: number[] = range(ord('!'), ord('~') + 1).concat(
    range(ord('¡'), ord('¬') + 1),
    range(ord('®'), ord('ÿ') + 1)
  );

  let cs: string[] = bs.slice().map(x => chr(x)); // Change the type of cs to string[]
  let n = 0;
  for (let b = 0; b < 2 ** 8; b++) {
    if (!bs.includes(b)) {
      bs.push(b);
      cs.push(chr(2 ** 8 + n));
      n = n + 1;
    }
  }

  const result: { [key: number]: string } = {};
  bs.map((_, i) => {
    result[bs[i]] = cs[i];
  });
  return result;
}

function get_pairs(word: string[]): Set<string[]> {
  const pairs: Set<string[]> = new Set();
  let prev_char: string = word[0];
  for (let i = 1; i < word.length; i++) {
    const char: string = word[i];
    pairs.add([prev_char, char]);
    prev_char = char;
  }
  return pairs;
}

const bpe_merges = (bpeFile: string): string[][] => {
  const lines = bpeFile.split('\n');
  const bpeMerges = lines.slice(1, lines.length - 1).map(x => {
    return x.split(/(\s+)/).filter(e => e.trim().length > 0);
  });
  return bpeMerges;
};

const byte_encoder: { [key: string]: string } = bytes_to_unicode();
const byte_decoder: { [key: string]: number } = {};
Object.keys(byte_encoder).map(x => {
  byte_decoder[byte_encoder[x]] = parseInt(x);
});

type BpeRanks = { [pair: string]: number };
const bpe_ranks: BpeRanks = dictZip(
  bpe_merges(bpe_file),
  range(0, bpe_merges.length)
);

const cache = new Map();

function bpe(token: string): string {
  if (cache.has(token)) {
    return cache.get(token) as string;
  }

  let word: string[] = token.split('');
  let pairs: Set<string[]> = get_pairs(word);

  if (pairs.size === 0) {
    return token;
  }

  while (true) {
    const minPairs: { [rank: number]: string[] } = {};
    Array.from(pairs).forEach(pair => {
      const rank: number = bpe_ranks[pair.join('')] ?? 10e10;
      minPairs[rank] = pair;
    });

    const minRank: number = Math.min(...Object.keys(minPairs).map(Number));
    const bigram: string[] | undefined = minPairs[minRank];

    if (!bigram || !(bigram.join('') in bpe_ranks)) {
      break;
    }

    const [first, second] = bigram;
    let new_word: string[] = [];
    let i = 0;

    while (i < word.length) {
      const j = word.indexOf(first, i);
      if (j === -1) {
        new_word = new_word.concat(word.slice(i));
        break;
      }
      new_word = new_word.concat(word.slice(i, j));
      i = j;

      if (word[i] === first && i < word.length - 1 && word[i + 1] === second) {
        new_word.push(first + second);
        i = i + 2;
      } else {
        new_word.push(word[i]);
        i = i + 1;
      }
    }

    word = new_word;
    if (word.length === 1) {
      break;
    } else {
      pairs = get_pairs(word);
    }
  }
  cache.set(token, word);
  return word.join('');
}

function encode(text: string): number[] {
  let bpe_tokens: number[] = [];
  const matches = Array.from(text.matchAll(pat)).map(x => x[0]);
  for (let token of matches) {
    token = encodeStr(token)
      .map(x => {
        return byte_encoder[x];
      })
      .join('');

    const new_tokens = bpe(token)
      .split(' ')
      .map(x => encoder[x]);
    bpe_tokens = bpe_tokens.concat(new_tokens);
  }
  return bpe_tokens;
}

type Decoder = { [key: number]: string };

const decoder: Decoder = {};
Object.keys(encoder).map(x => {
  decoder[parseInt(encoder[x])] = x;
});

const decodeStr = (bytes: number[]): string => {
  const textDecoder = new TextDecoder('utf-8');
  return textDecoder.decode(new Uint8Array(bytes));
};

function decode(tokens: number[]): string {
  let text = tokens.map(x => decoder[x]).join('');
  text = decodeStr(text.split('').map(x => byte_decoder[x]));
  return text;
}

function count(text: string): number {
  return encode(text).length;
}

export { encode, decode, count };
