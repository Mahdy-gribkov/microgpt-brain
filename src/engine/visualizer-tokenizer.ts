export class Tokenizer {
    chars: string[];
    stoi: { [key: string]: number };
    itos: { [key: number]: string };

    constructor(chars: string[]) {
        this.chars = chars;
        this.stoi = {};
        this.itos = {};
        chars.forEach((c, i) => {
            this.stoi[c] = i;
            this.itos[i] = c;
        });
    }

    encode(text: string): number[] {
        return text.split('').map(c => this.stoi[c] || 0); // Default to 0 if unknown
    }

    decode(ids: number[]): string {
        return ids.map(i => this.itos[i] || '').join('');
    }
}
