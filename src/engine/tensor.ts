/**
 * Minimal tensor implementation wrapping Float32Array.
 * Supports n-dimensional shapes with strides for efficient access.
 */

export class Tensor {
  data: Float32Array;
  shape: number[];
  strides: number[];
  grad: Tensor | null = null;
  requiresGrad: boolean;

  constructor(data: Float32Array, shape: number[], requiresGrad = false) {
    this.data = data;
    this.shape = shape;
    this.strides = Tensor.computeStrides(shape);
    this.requiresGrad = requiresGrad;
    if (requiresGrad) {
      this.grad = Tensor.zeros(shape);
    }
  }

  get size(): number {
    return this.data.length;
  }

  get ndim(): number {
    return this.shape.length;
  }

  static computeStrides(shape: number[]): number[] {
    const strides = new Array(shape.length);
    let stride = 1;
    for (let i = shape.length - 1; i >= 0; i--) {
      strides[i] = stride;
      stride *= shape[i];
    }
    return strides;
  }

  static zeros(shape: number[]): Tensor {
    const size = shape.reduce((a, b) => a * b, 1);
    return new Tensor(new Float32Array(size), shape);
  }

  static ones(shape: number[]): Tensor {
    const size = shape.reduce((a, b) => a * b, 1);
    const data = new Float32Array(size).fill(1);
    return new Tensor(data, shape);
  }

  static randn(shape: number[], std = 0.02): Tensor {
    const size = shape.reduce((a, b) => a * b, 1);
    const data = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      // Box-Muller transform
      const u1 = Math.random();
      const u2 = Math.random();
      data[i] = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * std;
    }
    return new Tensor(data, shape);
  }

  static from(array: number[] | number[][], requiresGrad = false): Tensor {
    if (Array.isArray(array[0])) {
      const rows = array as number[][];
      const shape = [rows.length, rows[0].length];
      const data = new Float32Array(shape[0] * shape[1]);
      for (let i = 0; i < rows.length; i++) {
        for (let j = 0; j < rows[0].length; j++) {
          data[i * shape[1] + j] = rows[i][j];
        }
      }
      return new Tensor(data, shape, requiresGrad);
    }
    const arr = array as number[];
    return new Tensor(new Float32Array(arr), [arr.length], requiresGrad);
  }

  /** Get flat index from multi-dimensional indices */
  index(...indices: number[]): number {
    let idx = 0;
    for (let i = 0; i < indices.length; i++) {
      idx += indices[i] * this.strides[i];
    }
    return idx;
  }

  get(...indices: number[]): number {
    return this.data[this.index(...indices)];
  }

  set(value: number, ...indices: number[]): void {
    this.data[this.index(...indices)] = value;
  }

  /** Get a row from a 2D tensor (returns a view into the same buffer) */
  row(i: number): Tensor {
    const cols = this.shape[1];
    const offset = i * cols;
    const data = this.data.subarray(offset, offset + cols);
    return new Tensor(data, [cols]);
  }

  /** Clone this tensor with a copy of the data */
  clone(): Tensor {
    return new Tensor(new Float32Array(this.data), [...this.shape], this.requiresGrad);
  }

  /** Zero out gradient */
  zeroGrad(): void {
    if (this.grad) {
      this.grad.data.fill(0);
    }
  }

  /** Fill all elements */
  fill(value: number): void {
    this.data.fill(value);
  }

  /** Reshape (must have same total size) */
  reshape(newShape: number[]): Tensor {
    const newSize = newShape.reduce((a, b) => a * b, 1);
    if (newSize !== this.size) {
      throw new Error(`Cannot reshape [${this.shape}] to [${newShape}]`);
    }
    return new Tensor(this.data, newShape, this.requiresGrad);
  }
}
