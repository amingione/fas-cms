#!/usr/bin/env node

const userAgent = process.env.npm_config_user_agent || '';
const usingYarn = userAgent.includes('yarn/');

if (!usingYarn) {
  console.error(
    '[fas-cms] This repository uses Yarn 4 as the canonical package manager. Use `yarn install` instead of npm.'
  );
  process.exit(1);
}
