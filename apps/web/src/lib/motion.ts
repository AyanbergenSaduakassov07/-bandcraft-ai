// Motion tokens for JS-driven animation. CSS durations/easings live in globals.css (@theme).
// Same spring params feed both anime.js (createSpring) and motion (useSpring).

/** Micro-interactions: hover, press, toggle. Milliseconds. */
export const duration = { fast: 150, base: 200, slow: 300 } as const

/** The score-reveal spring. Slight overshoot so the band "lands"; settles in ~0.9s. */
export const scoreSpring = { stiffness: 140, damping: 18, mass: 1 } as const

/** Criterion bars stagger in behind the overall band. Milliseconds. */
export const revealStagger = 40
