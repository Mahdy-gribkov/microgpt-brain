'use client';

import { motion } from 'framer-motion';
import { INSPIRATIONS, SPRING, STAGGER } from '../lib/constants';

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER.slow },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: SPRING.gentle },
};

export function InspirationSection() {
  return (
    <section className="py-16 px-4 md:px-8">
      <div className="max-w-4xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-50px' }}
          transition={SPRING.gentle}
          className="text-2xl md:text-3xl font-bold text-text text-center mb-3"
        >
          Standing on the Shoulders of Giants
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="text-muted text-center mb-10 text-sm"
        >
          This project wouldn&apos;t exist without these incredible resources
        </motion.p>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          {INSPIRATIONS.map((item) => (
            <motion.a
              key={item.name}
              variants={cardVariants}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="card group cursor-pointer hover:border-amber/30 transition-all"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-medium text-text group-hover:text-amber transition-colors">
                  {item.name}
                </h3>
                <svg className="w-3.5 h-3.5 text-muted group-hover:text-amber shrink-0 mt-0.5 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 17L17 7M17 7H7M17 7v10" />
                </svg>
              </div>
              <p className="text-xs text-muted leading-relaxed">{item.desc}</p>
            </motion.a>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
