'use client';

import { motion } from 'framer-motion';
import { SOCIAL_LINKS, INSPIRATIONS, TECH_STACK, SPRING } from '../lib/constants';

function GithubIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

function CodePenIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.144 13.067v-2.134L16.55 12zm1.715 1.135a.608.608 0 01-.047.22.456.456 0 01-.12.177L12.9 19.452a.674.674 0 01-.398.139.674.674 0 01-.398-.139L5.308 14.6a.456.456 0 01-.12-.177.608.608 0 01-.047-.22V9.797a.608.608 0 01.047-.22.456.456 0 01.12-.177L12.104 4.548a.674.674 0 01.398-.139.674.674 0 01.398.139L19.692 9.4a.456.456 0 01.12.177.608.608 0 01.047.22zM12 0C5.373 0 0 5.372 0 12s5.373 12 12 12 12-5.372 12-12S18.627 0 12 0z" />
    </svg>
  );
}

const socialIcons = [
  { href: SOCIAL_LINKS.github, label: 'GitHub', icon: GithubIcon },
  { href: SOCIAL_LINKS.githubSporesec, label: 'SporeSec', icon: GithubIcon },
  { href: SOCIAL_LINKS.linkedin, label: 'LinkedIn', icon: LinkedInIcon },
  { href: SOCIAL_LINKS.codepen, label: 'CodePen', icon: CodePenIcon },
];

export function RichFooter() {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={SPRING.gentle}
      className="border-t border-border mt-8"
    >
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          {/* Col 1: Identity */}
          <div>
            <h3 className="text-sm font-semibold text-text mb-3">Built by Mahdy Gribkov</h3>
            <div className="space-y-2 text-xs text-muted">
              <a
                href={SOCIAL_LINKS.portfolio}
                target="_blank"
                rel="noopener noreferrer"
                className="block hover:text-amber transition-colors"
              >
                mahdygribkov.vercel.app
              </a>
              <p>SporeSec — Security & Automation</p>
            </div>
            <div className="flex gap-3 mt-4">
              {socialIcons.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="text-muted hover:text-amber transition-colors"
                >
                  <s.icon />
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: Inspired By */}
          <div>
            <h3 className="text-sm font-semibold text-text mb-3">Inspired By</h3>
            <ul className="space-y-1.5">
              {INSPIRATIONS.slice(0, 5).map((item) => (
                <li key={item.name}>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted hover:text-amber transition-colors"
                  >
                    {item.name}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Col 3: Tech & Privacy */}
          <div>
            <h3 className="text-sm font-semibold text-text mb-3">Tech Stack</h3>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {TECH_STACK.map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-0.5 text-[10px] font-mono rounded-full border border-border text-muted"
                >
                  {tech}
                </span>
              ))}
            </div>
            <div className="space-y-1 text-xs text-muted">
              <p className="text-amber/80">100% client-side. Zero data leaves your browser.</p>
              <p>No templates. Built from scratch.</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-[10px] text-muted/60">
          <p>&copy; {new Date().getFullYear()} Mahdy Gribkov. All rights reserved.</p>
          <p>
            <a href={`mailto:${SOCIAL_LINKS.email}`} className="hover:text-amber transition-colors">
              {SOCIAL_LINKS.email}
            </a>
          </p>
        </div>
      </div>
    </motion.footer>
  );
}
