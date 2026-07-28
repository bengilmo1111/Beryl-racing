function mix(value) {
  let result = value | 0;
  result = Math.imul(result ^ (result >>> 16), 0x21f0aaad);
  result = Math.imul(result ^ (result >>> 15), 0x735a2d97);
  return (result ^ (result >>> 15)) >>> 0;
}

function unit(seed, bucket, channel) {
  return mix((seed ^ Math.imul(bucket + 1, 0x9e3779b1) ^ channel) >>> 0) / 4294967296;
}

// Stateless fuzz input. The same seed and 15-frame bucket always produce the
// same command, independent of how often the driver is called.
export default function random(state) {
  const bucket = Math.floor(state.frame / 15);
  const steer = unit(state.seed, bucket, 0x68bc21eb) * 2 - 1;
  const braking = unit(state.seed, bucket, 0x02e5be93) < 0.16;
  return {
    throttle: braking ? 0 : unit(state.seed, bucket, 0x967a889b) > 0.12 ? 1 : 0,
    brake: braking ? 1 : 0,
    steer,
  };
}
