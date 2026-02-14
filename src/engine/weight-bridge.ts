/**
 * Converts training engine Tensor data to visualizer ModelWeights format.
 * The training engine uses flat Float32Arrays (Tensor class).
 * The visualizer uses nested number[][] (ModelWeights interface).
 */

import type { MicroGPT, GPTConfig } from './model';
import type { CharTokenizer } from './tokenizer';
import type { ModelConfig, ModelWeights } from '../lib/visualizer-types';

/** Reshape a flat Float32Array into a 2D number[][] */
function reshape2D(data: Float32Array, rows: number, cols: number): number[][] {
  const result: number[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(data[r * cols + c]);
    }
    result.push(row);
  }
  return result;
}

/** Extract a slice of rows from a flat [totalRows, cols] tensor */
function sliceRows(data: Float32Array, cols: number, startRow: number, endRow: number): number[][] {
  const result: number[][] = [];
  for (let r = startRow; r < endRow; r++) {
    const row: number[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(data[r * cols + c]);
    }
    result.push(row);
  }
  return result;
}

/** Convert MicroGPT's GPTConfig + tokenizer into the visualizer's ModelConfig */
export function extractModelConfig(config: GPTConfig, tokenizer: CharTokenizer): ModelConfig {
  // Build chars array from tokenizer (sorted unique characters)
  const chars: string[] = [];
  for (let i = 0; i < tokenizer.vocabSize; i++) {
    const decoded = tokenizer.decode([i]);
    chars.push(decoded || '');
  }

  return {
    n_embd: config.nEmbd,
    n_head: config.nHead,
    n_layer: config.nLayer,
    vocab_size: config.vocabSize,
    block_size: config.blockSize,
    chars,
  };
}

/** Convert MicroGPT model weights to visualizer ModelWeights format */
export function extractWeights(model: MicroGPT): ModelWeights {
  const { nEmbd, nHead, vocabSize, blockSize } = model.config;
  const headSize = nEmbd / nHead;

  // Embeddings: flat [V*E] -> [V][E]
  const token_embedding = reshape2D(model.wte.data, vocabSize, nEmbd);
  const position_embedding = reshape2D(model.wpe.data, blockSize, nEmbd);

  // LM Head: flat [V*E] -> [V][E]
  const lm_head = reshape2D(model.lmHead.data, vocabSize, nEmbd);

  // Final layer norm: MicroGPT uses RMSNorm with no learned weights, so fill with 1.0
  const ln_f_weight = new Array(nEmbd).fill(1.0);

  // Per-layer weights
  const blocks = model.layers.map((layer) => {
    // Layer norms: no learned weights in MicroGPT (RMSNorm), fill 1.0
    const ln1_weight = new Array(nEmbd).fill(1.0);
    const ln2_weight = new Array(nEmbd).fill(1.0);

    // Attention output projection: [E, E] -> [E][E]
    const proj_weight = reshape2D(layer.attnWo.data, nEmbd, nEmbd);

    // Per-head Q/K/V weights
    // Training model stores [nEmbd, nEmbd] where rows are grouped by head:
    //   rows [h*headSize .. (h+1)*headSize] belong to head h
    const heads = [];
    for (let h = 0; h < nHead; h++) {
      const startRow = h * headSize;
      const endRow = (h + 1) * headSize;
      heads.push({
        query_weight: sliceRows(layer.attnWq.data, nEmbd, startRow, endRow),
        key_weight: sliceRows(layer.attnWk.data, nEmbd, startRow, endRow),
        value_weight: sliceRows(layer.attnWv.data, nEmbd, startRow, endRow),
      });
    }

    // FFN weights
    // mlpFc1: [4*nEmbd, nEmbd] -> [4*nEmbd][nEmbd]
    const net_0_weight = reshape2D(layer.mlpFc1.data, 4 * nEmbd, nEmbd);
    // mlpFc2: [nEmbd, 4*nEmbd] -> [nEmbd][4*nEmbd]
    const net_2_weight = reshape2D(layer.mlpFc2.data, nEmbd, 4 * nEmbd);

    return {
      ln1_weight,
      ln2_weight,
      attn: { proj_weight, heads },
      ffwd: { net_0_weight, net_2_weight },
    };
  });

  return {
    token_embedding,
    position_embedding,
    ln_f_weight,
    lm_head,
    blocks,
  };
}
