#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const result = spawnSync('tsc', ['-p', 'tsconfig.json', '--noEmit'], { stdio: 'inherit' });
process.exit(result.status ?? 1);
