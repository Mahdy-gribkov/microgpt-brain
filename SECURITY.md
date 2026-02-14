# Security Policy

## Overview

MicroGPT Playground is a **client-side only** educational application. All computation (training, inference, visualization) runs entirely in your browser. No data is sent to any server.

## What This Means

- Your training text never leaves your device
- Model weights exist only in browser memory
- No cookies, no analytics, no tracking
- No server-side processing or storage

## Architecture

- Training runs in a Web Worker (isolated thread)
- Input validation enforces strict limits on text length, model size, and training duration
- Content Security Policy headers restrict resource loading
- No iframe embedding allowed (X-Frame-Options: DENY)

## Security Limits

| Parameter | Limit |
|-----------|-------|
| Max input text | 50,000 characters |
| Max parameters | 5,000,000 |
| Max step duration | 30 seconds |
| Max training steps | 2,000 |
| Max estimated memory | 500 MB |

## Reporting Vulnerabilities

If you find a security issue, please report it responsibly:

1. **Email**: mahdygribkov@gmail.com
2. **Subject**: `[SECURITY] MicroGPT Playground - <brief description>`
3. **Include**: Steps to reproduce, potential impact, suggested fix if any

Please do NOT open a public GitHub issue for security vulnerabilities.

## Scope

**In scope:**
- XSS via training text input
- Prototype pollution via model config
- DoS via excessive computation
- CSP bypass
- Worker message injection

**Out of scope:**
- Browser-level vulnerabilities
- Physical access attacks
- Social engineering
- Third-party dependency vulnerabilities (report upstream)

## Response Timeline

- Acknowledgment: within 48 hours
- Fix for critical issues: within 7 days
- Public disclosure: after fix is deployed
