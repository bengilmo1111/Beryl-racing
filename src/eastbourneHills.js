import profiles from '../data/eastbourne/elevation-profiles.json' with { type: 'json' };

// LINZ NZVD2016 elevations, not extra height above the procedural ground.
// Along-route placement is deliberately compressed with the game's route.
export const HILL_OFFSETS = [0, 50, 100, 150, 200, 300, 400, 600];
export function hillElevation(fraction, column) {
  let a = profiles[0], b = profiles.at(-1);
  for (let i = 1; i < profiles.length; i++) {
    if (fraction <= profiles[i].routeFraction) { a = profiles[i - 1]; b = profiles[i]; break; }
  }
  const t = Math.max(0, Math.min(1, (fraction - a.routeFraction) / (b.routeFraction - a.routeFraction)));
  return Math.max(0, a.elevationsMetres[column] * (1 - t) + b.elevationsMetres[column] * t);
}
