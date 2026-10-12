export const clamp = n => Math.max(0, Math.min(1, n));
export const phase = (p, a, b) => clamp((p - a) / (b - a));
export const smooth = t => t * t * (3 - 2 * t);
// Constant acceleration in the first half, symmetric braking in the second.
export const easeInOut = t => t < .5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2;
// One continuous camera path, shared by WebGL and the doorway's DOM projection.
export function journey(p) {
  const flight = smooth(phase(p, .18, .78));
  return {
    cameraZ: 64 * Math.pow(4 / 64, flight) - 8,
    opening: smooth(phase(p, .36, .59)),
    flight,
  };
}
