import type { GPTConfig } from '../engine/model';
import type { AdamConfig } from '../engine/optimizer';

export interface TrainRequest {
  type: 'train';
  text: string;
  modelConfig: Omit<GPTConfig, 'vocabSize'>;
  adamConfig: AdamConfig;
}

export interface TrainProgress {
  type: 'progress';
  step: number;
  loss: number;
  totalSteps: number;
}

export interface TrainComplete {
  type: 'complete';
  finalLoss: number;
}

export interface GenerateRequest {
  type: 'generate';
  temperature: number;
  maxTokens: number;
}

export interface GenerateResult {
  type: 'generated';
  text: string;
}

export interface StopRequest {
  type: 'stop';
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export interface ReadyMessage {
  type: 'ready';
  paramCount: number;
  vocabSize: number;
}

export interface TimeoutMessage {
  type: 'timeout';
  step: number;
}

export interface GpuStatusMessage {
  type: 'gpu-status';
  available: boolean;
  gpuName: string;
  backend: 'cpu' | 'webgpu';
}

export type WorkerRequest = TrainRequest | GenerateRequest | StopRequest;
export type WorkerResponse = TrainProgress | TrainComplete | GenerateResult | ErrorMessage | ReadyMessage | TimeoutMessage | GpuStatusMessage;
