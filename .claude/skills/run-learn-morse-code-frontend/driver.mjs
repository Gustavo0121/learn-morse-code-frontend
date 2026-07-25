// Headless-Chromium driver for learn-morse-code-frontend (Angular SPA).
// Reads one command per line from stdin, drives a Playwright page, exits at EOF.
// Usage: node driver.mjs <<'EOF' ... EOF   (see SKILL.md)
import { chromium } from 'playwright';
import * as readline from 'node:readline';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOT_DIR = process.env.SCREENSHOT_DIR || path.resolve(import.meta.dirname, 'screenshots');
fs.mkdirSync(SHOT_DIR, { recursive: true });
const BASE_URL = process.env.BASE_URL || 'http://localhost:4200';

const consoleLog = [];

const browser = await chromium.launch();
const context = await browser.newContext();
// The app calls navigator.clipboard.writeText() (translate copy buttons) —
// Playwright denies clipboard-write by default, which looks like a real bug
// (silent no-op) unless permissions are granted up front.
await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: BASE_URL });
const page = await context.newPage();
page.on('console', (msg) => consoleLog.push({ type: msg.type(), text: msg.text() }));
page.on('pageerror', (err) => consoleLog.push({ type: 'pageerror', text: String(err) }));

function resolveUrl(target) {
  return /^https?:\/\//.test(target) ? target : new URL(target, BASE_URL).toString();
}

const COMMANDS = {
  async nav(target) {
    await page.goto(resolveUrl(target), { waitUntil: 'networkidle' });
    console.log('nav', target, '→ ok');
  },

  async 'wait-for'(selector) {
    try {
      await page.waitForSelector(selector, { timeout: 10_000 });
      console.log('wait-for', selector, '→ found');
    } catch {
      console.log('wait-for', selector, '→ TIMEOUT');
    }
  },

  async screenshot(name) {
    const file = path.join(SHOT_DIR, `${name || `ss-${Date.now()}`}.png`);
    await page.screenshot({ path: file, fullPage: true });
    console.log('screenshot:', file);
  },

  // Playwright selector engines only (css, text=, #id, [attr=]…) — NOT
  // getByLabel/getByRole. Those threw "strict mode violation" here because
  // aria-label substrings collide (e.g. a "Listen" button labelled "Ouvir a
  // sequência Morse" also matches a `getByLabel('Morse')` lookup on the
  // textarea). Prefer `#id` or `text=` for anything ambiguous.
  async click(selector) {
    try {
      await page.click(selector, { timeout: 10_000 });
      console.log('click', selector, '→ ok');
    } catch (e) {
      console.log('click', selector, '→ ERROR:', e.message.split('\n')[0]);
    }
  },

  async fill(selector, ...rest) {
    const value = rest.join(' ');
    await page.fill(selector, value);
    console.log('fill', selector, JSON.stringify(value), '→ ok');
  },

  async press(key) {
    await page.keyboard.press(key);
    console.log('press', key, '→ ok');
  },

  async text(selector) {
    const value = await page.evaluate(
      (s) => (s ? document.querySelector(s) : document.body)?.innerText ?? '(null)',
      selector || null,
    );
    console.log(value);
  },

  async 'value'(selector) {
    const value = await page.inputValue(selector).catch((e) => `ERROR: ${e.message.split('\n')[0]}`);
    console.log(value);
  },

  async eval(expr) {
    try {
      console.log(JSON.stringify(await page.evaluate(expr)));
    } catch (e) {
      console.log('ERROR:', e.message.split('\n')[0]);
    }
  },

  console(flag) {
    const entries = flag === '--errors'
      ? consoleLog.filter((e) => e.type === 'error' || e.type === 'pageerror')
      : consoleLog;
    if (entries.length === 0) {
      console.log('(no console output)');
    }
    for (const entry of entries) {
      console.log(`[${entry.type}] ${entry.text}`);
    }
  },

  help() {
    console.log('commands:', Object.keys(COMMANDS).join(', '));
  },
};

// Buffered, not event-per-line: a piped heredoc delivers every line before
// any async command finishes, so 'line' handlers would race (e.g. the
// screenshot firing before nav's networkidle wait resolves). Collect first,
// run sequentially after 'close'.
const lines = [];
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', (line) => lines.push(line));

rl.on('close', async () => {
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [cmd, ...args] = trimmed.split(/\s+/);
    const fn = COMMANDS[cmd];
    if (!fn) {
      console.log('unknown command:', cmd, '— try: help');
      continue;
    }
    try {
      await fn(...args);
    } catch (e) {
      console.log('ERROR running', cmd, ':', e.message);
    }
  }
  await browser.close();
  process.exit(0);
});
