'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';

interface ArchitectureDiagramProps {
  nLayer: number;
  nHead: number;
  nEmbd: number;
}

const pathTransition = { duration: 1.5, ease: 'easeInOut' as const };

export const ArchitectureDiagram = memo(function ArchitectureDiagram({ nLayer, nHead, nEmbd }: ArchitectureDiagramProps) {
  const configKey = `${nLayer}-${nHead}-${nEmbd}`;
  const blockH = 52;
  const gap = 8;
  const topPad = 60;
  const botPad = 80;
  const totalH = topPad + nLayer * (blockH + gap) + botPad + 40;
  const cx = 160;
  const boxW = 240;

  return (
    <div className="card">
      <h2 className="text-sm font-medium text-text mb-3">Architecture</h2>
      <div className="flex justify-center overflow-x-auto">
        <motion.svg
          key={configKey}
          viewBox={`0 0 320 ${totalH}`}
          className="text-muted w-full max-w-[320px]"
          preserveAspectRatio="xMidYMin meet"
        >
          {/* Input */}
          <motion.text
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            x={cx} y={20} textAnchor="middle" fill="currentColor" fontSize={11}
          >
            Input Characters
          </motion.text>

          {/* Arrow down to Embedding */}
          <motion.line
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={pathTransition}
            x1={cx} y1={28} x2={cx} y2={42}
            stroke="var(--amber)" strokeWidth={1.5} markerEnd="url(#arrow)"
          />

          {/* Embedding box */}
          <motion.rect
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            x={cx - boxW / 2} y={44} width={boxW} height={24} rx={6}
            fill="var(--bg-hover)" stroke="var(--border)"
          />
          <motion.text
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            x={cx} y={60} textAnchor="middle" fill="var(--amber-light)" fontSize={10}
          >
            Token + Position Embedding ({nEmbd}d)
          </motion.text>

          {/* Transformer blocks */}
          {Array.from({ length: nLayer }, (_, i) => {
            const y = topPad + 16 + i * (blockH + gap);
            return (
              <motion.g key={i}>
                {/* Arrow into block */}
                <motion.line
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ ...pathTransition, delay: 0.2 + i * 0.1 }}
                  x1={cx} y1={y - gap} x2={cx} y2={y}
                  stroke="var(--amber)" strokeWidth={1.5}
                />
                {/* Block rect */}
                <motion.rect
                  initial={{ opacity: 0, x: cx - boxW / 2 + 10, width: boxW - 20 }}
                  animate={{ opacity: 1, x: cx - boxW / 2, width: boxW }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.4 }}
                  y={y} height={blockH} rx={8}
                  fill="var(--bg-card)" stroke="var(--border)"
                />
                {/* Block label */}
                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  x={cx} y={y + 18} textAnchor="middle" fill="var(--text)" fontSize={10} fontWeight={500}
                >
                  Transformer Block {i + 1}
                </motion.text>
                {/* Sub-labels */}
                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  x={cx} y={y + 32} textAnchor="middle" fill="var(--text-muted)" fontSize={9}
                >
                  RMSNorm → Attn({nHead}H) → Residual
                </motion.text>
                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  x={cx} y={y + 44} textAnchor="middle" fill="var(--text-muted)" fontSize={9}
                >
                  RMSNorm → FFN(4×{nEmbd}) → Residual
                </motion.text>
              </motion.g>
            );
          })}

          {/* Arrow to LM Head */}
          {(() => {
            const lastBlockEnd = topPad + 16 + nLayer * (blockH + gap) - gap + blockH;
            return (
              <>
                <motion.line
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ ...pathTransition, delay: 0.3 + nLayer * 0.1 }}
                  x1={cx} y1={lastBlockEnd} x2={cx} y2={lastBlockEnd + 14}
                  stroke="var(--amber)" strokeWidth={1.5}
                />
                <motion.rect
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 + nLayer * 0.1 }}
                  x={cx - boxW / 2} y={lastBlockEnd + 16} width={boxW} height={24} rx={6}
                  fill="var(--bg-hover)" stroke="var(--border)"
                />
                <motion.text
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 + nLayer * 0.1 }}
                  x={cx} y={lastBlockEnd + 32} textAnchor="middle" fill="var(--amber-light)" fontSize={10}
                >
                  LM Head → Softmax → Next Char
                </motion.text>
              </>
            );
          })()}

          {/* Arrow marker */}
          <defs>
            <marker id="arrow" markerWidth={6} markerHeight={6} refX={5} refY={3} orient="auto">
              <path d="M0,0 L6,3 L0,6" fill="var(--amber)" />
            </marker>
          </defs>
        </motion.svg>
      </div>
    </div>
  );
});
