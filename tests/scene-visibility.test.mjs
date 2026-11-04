import test from 'node:test';
import assert from 'node:assert/strict';
import { observeSceneVisibility } from '../src/observeSceneVisibility.js';

function browser(t) {
  const window = new EventTarget(), document = new EventTarget();
  document.hidden = false;
  const frames = new Map(), observers = [];
  let id = 0;
  const globals = {
    window, document, innerHeight: 900,
    requestAnimationFrame: fn => { frames.set(++id, fn); return id; },
    cancelAnimationFrame: key => frames.delete(key),
    IntersectionObserver: class {
      constructor(callback) { this.callback = callback; observers.push(this); }
      observe() {}
      disconnect() { this.disconnected = true; }
    },
  };
  for (const [key, value] of Object.entries(globals)) {
    const original = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => {
      if (original) Object.defineProperty(globalThis, key, original);
      else delete globalThis[key];
    });
  }
  return {
    window, document, frames, observers,
    flush() { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(fn => fn()); },
  };
}

test('sticky Home stops under an opaque section, resumes on return, and pauses in hidden tabs', t => {
  const env = browser(t), changes = [];
  let coverTop = 900;
  const host = { getBoundingClientRect: () => ({ top: 0, bottom: 900 }) };
  const cover = { getBoundingClientRect: () => ({ top: coverTop }) };
  const stop = observeSceneVisibility(host, value => changes.push(value), { cover });
  assert.deepEqual(changes, [true]);
  coverTop = 0;
  for (let i = 0; i < 10; i++) env.window.dispatchEvent(new Event('scroll'));
  assert.equal(env.frames.size, 1, 'coalesce repeated scrolling into one visibility check');
  env.flush();
  assert.deepEqual(changes, [true, false]);
  coverTop = 120;
  env.window.dispatchEvent(new Event('scroll')); env.flush();
  env.document.hidden = true; env.document.dispatchEvent(new Event('visibilitychange'));
  env.document.hidden = false; env.document.dispatchEvent(new Event('visibilitychange'));
  assert.deepEqual(changes, [true, false, true, false, true]);
  stop();
});

test('ordinary scenes use intersection changes without checking on every scroll', t => {
  const env = browser(t), changes = [];
  let top = 1500;
  const stop = observeSceneVisibility({ getBoundingClientRect: () => ({ top, bottom: top + 600 }) }, value => changes.push(value));
  assert.deepEqual(changes, [false]);
  top = 500;
  env.window.dispatchEvent(new Event('scroll'));
  assert.equal(env.frames.size, 0);
  env.observers[0].callback();
  env.observers[0].callback();
  assert.deepEqual(changes, [false, true], 'unchanged visibility must not restart a running scene');
  top = -650;
  env.observers[0].callback();
  assert.deepEqual(changes, [false, true, false]);
  stop();
});

test('cleanup cancels pending checks and ignores a queued observer notification', t => {
  const env = browser(t), changes = [];
  const host = { getBoundingClientRect: () => ({ top: 0, bottom: 900 }) };
  const stop = observeSceneVisibility(host, value => changes.push(value), { cover: { getBoundingClientRect: () => ({ top: 900 }) } });
  env.window.dispatchEvent(new Event('resize'));
  assert.equal(env.frames.size, 1);
  stop();
  assert.equal(env.frames.size, 0);
  assert.equal(env.observers[0].disconnected, true);
  env.document.hidden = true;
  env.observers[0].callback();
  env.document.dispatchEvent(new Event('visibilitychange'));
  env.window.dispatchEvent(new Event('scroll'));
  env.window.dispatchEvent(new Event('resize'));
  assert.equal(env.frames.size, 0);
  assert.deepEqual(changes, [true]);
});
