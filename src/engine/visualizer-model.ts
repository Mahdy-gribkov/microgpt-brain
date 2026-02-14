import { ModelConfig, ModelWeights, InferenceTrace } from "@/lib/visualizer-types";

// Matrix helper functions
function matMul(a: number[][], b: number[][]): number[][] {
    const m = a.length;
    const n = a[0].length;
    const p = b[0].length;
    const result = Array(m).fill(0).map(() => Array(p).fill(0));
    for (let i = 0; i < m; i++) {
        for (let j = 0; j < p; j++) {
            let sum = 0;
            for (let k = 0; k < n; k++) {
                sum += a[i][k] * b[k][j];
            }
            result[i][j] = sum;
        }
    }
    return result;
}

function add(a: number[][], b: number[][]): number[][] {
    return a.map((row, i) => row.map((val, j) => val + b[i][j]));
}

function rmsNorm(x: number[][], weight: number[]): number[][] {
    return x.map((row) => {
        const ss = row.reduce((sum, val) => sum + val * val, 0);
        const rms = Math.sqrt(ss / row.length + 1e-5);
        return row.map((val, i) => (val / rms) * weight[i]);
    });
}

function softmax(x: number[]): number[] {
    const max = Math.max(...x);
    const exp = x.map((v) => Math.exp(v - max));
    const sum = exp.reduce((a, b) => a + b, 0);
    return exp.map((v) => v / sum);
}

function transpose(m: number[][]): number[][] {
    return m[0].map((_, i) => m.map(row => row[i]));
}

// Helper for Linear layer: x @ w^T
function linear(x: number[][], w: number[][]): number[][] {
    // w is [out_features, in_features] from PyTorch
    // x is [seq_len, in_features]
    // We want output [seq_len, out_features]
    // So we need matMul(x, w^T)
    const wT = transpose(w);
    return matMul(x, wT);
}

function softmax2D(x: number[][]): number[][] {
    return x.map(row => softmax(row));
}

// Main Inference Function
export function runInference(
    tokens: string[],
    tokenIds: number[],
    config: ModelConfig,
    weights: ModelWeights,
    params: { temperature: number; topK: number } = { temperature: 1.0, topK: 50 }
): InferenceTrace {
    const seqLen = tokenIds.length;
    const { n_embd, n_head } = config;
    const headSize = n_embd / n_head;

    // 1. Token Embeddings
    const tokenEmbeddings = tokenIds.map((id) => weights.token_embedding[id]);

    // 2. Positional Embeddings
    const posEmbeddings = weights.position_embedding.slice(0, seqLen);

    // 3. Initial Residual
    let x = add(tokenEmbeddings, posEmbeddings);

    const layerTraces = [];

    // 4. Transformer Blocks
    for (let i = 0; i < config.n_layer; i++) {
        const blockWeights = weights.blocks[i];

        // --- RMSNorm 1 ---
        const preNorm1 = rmsNorm(x, blockWeights.ln1_weight);

        // --- Multi-Head Attention ---
        const qHeads: number[][][] = []; // [head][seq][headSize]
        const kHeads: number[][][] = [];
        const vHeads: number[][][] = [];
        const scoresHeads: number[][][] = []; // [head][seq][seq]
        const headOutputs: number[][][] = []; // [head][seq][headSize]

        for (let h = 0; h < n_head; h++) {
            const hW = blockWeights.attn.heads[h];

            // Linear projections
            const q = linear(preNorm1, hW.query_weight); // [seq, headSize]
            const k = linear(preNorm1, hW.key_weight);
            const v = linear(preNorm1, hW.value_weight);

            qHeads.push(q);
            kHeads.push(k);
            vHeads.push(v);

            // Q @ K^T / sqrt(d)
            // (seq, headSize) @ (headSize, seq) -> (seq, seq)
            const kT = transpose(k);
            let scores = matMul(q, kT);

            // Scale
            const scale = 1.0 / Math.sqrt(headSize);
            scores = scores.map(row => row.map(val => val * scale));

            // Causal Mask
            for (let r = 0; r < seqLen; r++) {
                for (let c = 0; c < seqLen; c++) {
                    if (c > r) scores[r][c] = -1e9;
                }
            }

            // Softmax
            const attnWeights = softmax2D(scores);
            scoresHeads.push(attnWeights);

            // Weighted Sum: attnWeights @ v
            // (seq, seq) @ (seq, headSize) -> (seq, headSize)
            const out = matMul(attnWeights, v);
            headOutputs.push(out);
        }

        // Concat heads properly: [seq, head0_dim0...headN_dimM]
        const concatAttention: number[][] = [];
        for (let r = 0; r < seqLen; r++) {
            const row: number[] = [];
            for (let h = 0; h < n_head; h++) {
                row.push(...headOutputs[h][r]);
            }
            concatAttention.push(row);
        }

        // Projection
        const projectedAttention = linear(concatAttention, blockWeights.attn.proj_weight); // [seq, n_embd]

        // Residual 1
        x = add(x, projectedAttention);
        const postAttention = JSON.parse(JSON.stringify(x)); // Deep copy state

        // --- FFN ---
        const preNorm2 = rmsNorm(x, blockWeights.ln2_weight);

        // Up projection
        const ffnHiddenLin = linear(preNorm2, blockWeights.ffwd.net_0_weight);
        // ReLU
        const ffnHidden = ffnHiddenLin.map(row => row.map(val => Math.max(0, val)));

        // Down projection
        const ffnOut = linear(ffnHidden, blockWeights.ffwd.net_2_weight);

        // Residual 2
        x = add(x, ffnOut);

        layerTraces.push({
            preNorm1,
            q: qHeads,
            k: kHeads,
            v: vHeads,
            scores: scoresHeads,
            postAttention,
            preNorm2,
            ffnHidden,
            ffnOut,
            blockOutput: JSON.parse(JSON.stringify(x))
        });
    }

    // 5. Final Norm
    const finalNorm = rmsNorm(x, weights.ln_f_weight);

    // 6. Logits
    const lastState = finalNorm[finalNorm.length - 1];

    // Compute logits: dot(lastState, lm_head[i])
    let logits = weights.lm_head.map(row => {
        return row.reduce((sum, val, i) => sum + val * lastState[i], 0);
    });

    // --- SAMPLING LOGIC ---

    // 1. Temperature Scaling
    // Avoid divide by zero
    const temp = Math.max(params.temperature, 1e-5);
    logits = logits.map(l => l / temp);

    // 2. Top-K Filtering
    if (params.topK > 0 && params.topK < logits.length) {
        // Find the K-th largest value
        const sortedLogits = [...logits].sort((a, b) => b - a);
        const cutoff = sortedLogits[params.topK - 1];

        // Mask logits below cutoff
        logits = logits.map(l => (l >= cutoff ? l : -1e9));
    }

    // 3. Softmax
    const probabilities = softmax(logits);

    // Find max (greedy choice from the modified probs)
    let maxProb = -1;
    let predictedTokenId = 0;
    probabilities.forEach((p, i) => {
        if (p > maxProb) {
            maxProb = p;
            predictedTokenId = i;
        }
    });

    // Predicted token string logic handled by caller (tokenizer lookup)

    return {
        inputTokens: tokens,
        inputIds: tokenIds,
        tokenEmbeddings,
        posEmbeddings,
        layers: layerTraces,
        finalNorm,
        logits,        // these are the post-temp/post-topk logits
        probabilities, // these reflect the sampling settings
        predictedTokenId,
        predictedToken: "" // Filled by caller
    };
}
