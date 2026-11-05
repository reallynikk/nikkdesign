import test from 'node:test';
import assert from 'node:assert/strict';

const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};
const tick = () => new Promise(resolve => setImmediate(resolve));

function browser(t, { failVideo = false } = {}) {
  const font = deferred(), portrait = deferred(), stream = deferred();
  const decoded = [], players = [], requests = [];
  const globals = {
    Image: class {
      set src(value) { this.url = value; queueMicrotask(() => this.onload()); }
      async decode() {
        if (this.url.includes('about-photo')) await portrait.promise;
        decoded.push(this.url);
      }
    },
    document: {
      fonts: { load: () => Promise.resolve(), ready: font.promise },
      createElement(name) {
        assert.equal(name, 'video');
        const player = new EventTarget();
        player.setAttribute = () => {};
        player.load = () => queueMicrotask(() => player.dispatchEvent(new Event('loadeddata')));
        players.push(player);
        return player;
      },
    },
    fetch: async url => {
      requests.push(url);
      if (failVideo && url.includes('power-q')) return new Response('', { status: 503 });
      return new Response(new ReadableStream({
        async start(controller) {
          controller.enqueue(new Uint8Array([1, 2]));
          await stream.promise;
          controller.enqueue(new Uint8Array([3, 4]));
          controller.close();
        },
      }), { headers: { 'content-length': '4' } });
    },
  };
  for (const [name, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, name, previous) : delete globalThis[name]);
  }
  t.after(() => players.forEach(player => { if (player.src) URL.revokeObjectURL(player.src); }));
  return { font, portrait, stream, decoded, players, requests };
}

test('preparation waits for complete video downloads, image decode and fonts; shared callers reuse resources', async t => {
  const env = browser(t);
  const media = await import(`../src/portfolioMedia.js?ready=${Date.now()}`);
  const updates = [];
  let ready = false;
  const preparation = media.preparePortfolioMedia(value => updates.push(value));
  assert.equal(preparation, media.preparePortfolioMedia());
  preparation.then(() => { ready = true; });
  await tick();
  assert.equal(ready, false, 'incomplete video data must keep the loading gate closed');
  assert.equal(env.requests.length, media.videoWorks.length, 'only one request per video');
  env.stream.resolve();
  await tick();
  assert.equal(ready, false, 'downloading is insufficient while image decode is pending');
  env.portrait.resolve();
  await tick();
  assert.equal(ready, false, 'decoded media must still wait for fonts');
  env.font.resolve();
  await preparation;
  assert.equal(ready, true);
  assert.equal(updates.at(-1), 1);
  assert(updates.every((value, index) => index === 0 || value >= updates[index - 1]));
  assert.equal(env.players.length, media.videoWorks.length, 'repeated cards share one decoder per video');
  assert.equal(media.getPortfolioVideo('power-q.mp4'), media.getPortfolioVideo('power-q.mp4'));
  assert.equal(env.decoded.filter(url => url.includes('preview-4.webp')).length, 1);
});

test('a missing video rejects preparation instead of announcing completion', async t => {
  const env = browser(t, { failVideo: true });
  const media = await import(`../src/portfolioMedia.js?failure=${Date.now()}`);
  const updates = [];
  const preparation = media.preparePortfolioMedia(value => updates.push(value));
  env.stream.resolve(); env.portrait.resolve(); env.font.resolve();
  await assert.rejects(preparation, /Video unavailable: power-q.mp4/);
  await tick();
  assert(updates.every(value => value < 1));
});

test('Home and Contacts share playback without a hidden scene pausing the visible scene', async () => {
  const { setPortfolioVideoActive } = await import('../src/portfolioMedia.js');
  const home = {}, contacts = {};
  let plays = 0, pauses = 0;
  const video = {
    paused: true,
    play() { plays++; this.paused = false; return Promise.resolve(); },
    pause() { pauses++; this.paused = true; },
  };
  await setPortfolioVideoActive(video, home, true);
  await setPortfolioVideoActive(video, contacts, true);
  await setPortfolioVideoActive(video, home, false);
  assert.equal(video.paused, false, 'Contacts keeps the shared video running after Home leaves');
  assert.equal(plays, 1, 'adding another visible scene does not restart playback');
  await setPortfolioVideoActive(video, contacts, false);
  assert.equal(video.paused, true);
  assert.equal(pauses, 1);
  await setPortfolioVideoActive(video, home, false);
  assert.equal(pauses, 1, 'cleaning an inactive scene cannot pause another owner');
  await setPortfolioVideoActive(video, contacts, true);
  assert.equal(plays, 2, 'returning to Contacts resumes playback');
});
