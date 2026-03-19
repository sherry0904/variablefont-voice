export function lerp(start: number, end: number, factor: number) {
  return start + (end - start) * factor;
}

// 產生 0 到 1 之間平滑循環的正弦波數值，用於呼吸感
export function getSineWave(speed: number) {
  return (Math.sin(Date.now() / speed) + 1) / 2;
}
