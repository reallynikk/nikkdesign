// One decoded image / video per source, shared by all cards and preparation.
export const galleryImages = ['preview-0.webp', 'curators-shirts.svg', 'card-front.jpg', 'preview-2.webp', 'sticker-one.jpg', 'preview-4.webp', 'bag-front.jpg', 'preview-1.webp', 'sticker-two.jpg', 'preview-3.webp', 'stickers-front.jpg', 'card-back.jpg'];
export const videoWorks = [
  { file: 'sticker.mp4', title: 'Наклейка' },
  { file: 'curators-ispu.mp4', title: 'Кураторы ИГЭУ' },
  { file: 'power-q.mp4', title: 'PowerQ' },
];

const images = new Map(), videos = new Map(), listeners = new Set();
const videoOwners = new WeakMap();
let preparation, progress = 0;

// Home and Contacts share decoders. A hidden scene may only release its own claim.
export function setPortfolioVideoActive(video, owner, active) {
  if (!videoOwners.has(video)) videoOwners.set(video, new Set());
  const owners = videoOwners.get(video);
  const wasActive = owners.size > 0;
  if (active) owners.add(owner);
  else owners.delete(owner);
  if (!owners.size) {
    if (wasActive) video.pause();
    return Promise.resolve();
  }
  if (active && (!wasActive || video.paused)) return video.play();
  return Promise.resolve();
}

export function loadPortfolioImage(name) {
  if (!images.has(name)) images.set(name, new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => image.decode().then(() => resolve(image), reject);
    image.onerror = () => reject(new Error(`Image unavailable: ${name}`));
    image.src = `/assets/${name}`;
  }));
  return images.get(name);
}

export function getPortfolioVideo(file) {
  if (!videos.has(file)) {
    const video = document.createElement('video');
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'auto';
    videos.set(file, video);
  }
  return videos.get(file);
}

async function loadVideo(work, report) {
  const response = await fetch(`/assets/videos/${work.file}`);
  if (!response.ok) throw new Error(`Video unavailable: ${work.file}`);
  const size = Number(response.headers.get('content-length'));
  const chunks = [];
  if (response.body) {
    const reader = response.body.getReader();
    let received = 0;
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (size) report(Math.min(.95, received / size * .95));
    }
  } else chunks.push(await response.arrayBuffer());
  const video = getPortfolioVideo(work.file);
  // Finish downloading the small preview before the loader closes to avoid rebuffering.
  await new Promise((resolve, reject) => {
    video.addEventListener('loadeddata', resolve, { once: true });
    video.addEventListener('error', reject, { once: true });
    video.src = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
    video.load();
  });
  report(1);
}

export function preparePortfolioMedia(onProgress) {
  if (onProgress) { listeners.add(onProgress); onProgress(progress); }
  if (!preparation) {
    const names = [...new Set([...galleryImages, 'about-photo.webp', 'logo.svg', 'logo-mark.svg', 'logo-white.svg',
      'icons/user-round.svg', 'icons/layout-grid.svg', 'icons/message-circle.svg', 'icons/send.svg'])];
    const amounts = Array(names.length + videoWorks.length + 1).fill(0);
    const report = (index, value) => {
      amounts[index] = value;
      progress = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
      for (const listener of listeners) listener(progress);
    };
    preparation = Promise.all([
      ...names.map((name, index) => loadPortfolioImage(name).then(() => report(index, 1))),
      ...videoWorks.map((work, index) => loadVideo(work, value => report(names.length + index, value))),
      Promise.all([400, 450, 500, 550].map(weight => document.fonts.load(`${weight} 24px Manrope`, 'Никита Иванов nikk')))
        .then(() => document.fonts.ready).then(() => report(amounts.length - 1, 1)),
    ]).finally(() => listeners.clear());
  }
  return preparation;
}
