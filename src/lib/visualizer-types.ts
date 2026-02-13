export interface ModelConfig {
    n_embd: number;
    n_head: number;
    n_layer: number;
    vocab_size: number;
    block_size: number;
    chars: string[];
}

export interface ModelWeights {
    token_embedding: number[][];
    position_embedding: number[][];
    ln_f_weight: number[];
    lm_head: number[][];
    blocks: {
        ln1_weight: number[];
        ln2_weight: number[];
        attn: {
            proj_weight: number[][];
            heads: {
                key_weight: number[][];
                query_weight: number[][];
                value_weight: number[][];
            }[];
        };
        ffwd: {
            net_0_weight: number[][];
            net_2_weight: number[][];
        };
    }[];
}

// Breakdown of a single layer's trace data
export interface TraceLayer {
    preNorm1: number[][];
    q: number[][][]; // [head][seq][dim]
    k: number[][][];
    v: number[][][];
    scores: number[][][]; // [head][seq][seq]
    postAttention: number[][]; // after proj
    preNorm2: number[][];
    ffnHidden: number[][];
    ffnOut: number[][];
    blockOutput: number[][];
}

export interface InspectorData {
    title: string;
    description: string;
    formula?: string;
    values?: number[];
}

export interface InferenceTrace {
    inputTokens: string[];
    inputIds: number[];
    tokenEmbeddings: number[][];
    posEmbeddings: number[][];
    layers: TraceLayer[];
    finalNorm: number[][];
    logits: number[];
    probabilities: number[];
    predictedTokenId: number;
    predictedToken: string;
}
