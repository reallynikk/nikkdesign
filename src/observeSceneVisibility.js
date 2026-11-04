// A sticky canvas can intersect the viewport while an opaque section covers it.
// Only that case needs scroll checks; normal scenes use IntersectionObserver.
export function observeSceneVisibility(host, onChange, { cover = null } = {}) {
  let frame = 0, current, disposed = false;
  const update = () => {
    if (disposed) return;
    cancelAnimationFrame(frame);
    frame = 0;
    const rect = host.getBoundingClientRect();
    const visible = !document.hidden && rect.bottom > 0 && rect.top < innerHeight
      && (!cover || cover.getBoundingClientRect().top > 0);
    if (visible !== current) {
      current = visible;
      onChange(visible);
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  const observer = new IntersectionObserver(update);
  observer.observe(host);
  if (cover) window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  document.addEventListener('visibilitychange', update);
  update();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    if (cover) window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    document.removeEventListener('visibilitychange', update);
  };
}
