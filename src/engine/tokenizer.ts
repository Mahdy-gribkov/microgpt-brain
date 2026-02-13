/**
 * Character-level tokenizer matching Karpathy's microGPT.
 * Maps unique characters to integer indices.
 */

export class CharTokenizer {
  private charToIdx: Map<string, number>;
  private idxToChar: string[];
  readonly bosToken: number;

  constructor(text: string) {
    const chars = [...new Set(text)].sort();
    this.idxToChar = chars;
    this.charToIdx = new Map();
    for (let i = 0; i < chars.length; i++) {
      this.charToIdx.set(chars[i], i);
    }
    // BOS/EOS token is the last index (matching Karpathy)
    this.bosToken = chars.length;
  }

  get vocabSize(): number {
    return this.idxToChar.length + 1; // +1 for BOS token
  }

  encode(text: string): number[] {
    const tokens: number[] = [];
    for (const ch of text) {
      const idx = this.charToIdx.get(ch);
      if (idx !== undefined) {
        tokens.push(idx);
      }
    }
    return tokens;
  }

  decode(indices: number[]): string {
    return indices
      .filter((i) => i < this.idxToChar.length)
      .map((i) => this.idxToChar[i])
      .join('');
  }

  /** Encode a document with BOS tokens wrapping it (matching Karpathy) */
  encodeDoc(text: string): number[] {
    return [this.bosToken, ...this.encode(text), this.bosToken];
  }
}
