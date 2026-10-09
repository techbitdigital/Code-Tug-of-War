const spring = (stiffness: number, damping: number, mass = 1) => ({
  type: "spring" as const,
  stiffness,
  damping,
  mass,
});

// Named motionTokens (not `motion`) so it never collides with framer-motion's `motion`.
export const motionTokens = {
  snap: spring(520, 32), // buttons, chips
  pull: spring(260, 18, 1.2), // rope + knot (slight overshoot)
  settle: spring(180, 26), // panels, reveal
  out: [0.22, 1, 0.36, 1] as [number, number, number, number], // easeOutQuint
  dur: { fast: 0.15, base: 0.3, slow: 0.6 },
};