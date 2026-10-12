export function springStep(state, target, elapsed, stiffness = 100, damping = 10) {
  const dt = Math.min(Math.max(elapsed, 0), 1 / 30);
  // Two substeps keep the secondary motion stable on slower devices.
  for (let i = 0; i < 2; i++) {
    state.velocity += ((target - state.value) * stiffness - state.velocity * damping) * dt / 2;
    state.value += state.velocity * dt / 2;
  }
  return state.value;
}

export const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
