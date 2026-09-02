export const GAME_INFO = {
  id: 'pulso-runner',
  name: 'Pulso Runner',
  version: '1.1.0',
  orientation: 'landscape' as const,
  minPlayers: 1,
  maxPlayers: 1,
  supportsPoints: true,
  resultSchemaVersion: 1
};

export const PHYSICS_CONFIG = {
  // Tuned to feel much closer to Chrome Dino.
  gravity: 2400,
  jumpPower: -900,
  baseSpeed: 330,
  speedIncrement: 18,
  speedEveryPoints: 50,

  // Logical character size. The source PNG is fitted into this box,
  // so a large source image cannot make the player huge.
  playerHeight: 58,
  playerWidth: 58,

  groundHeight: 42,
  hitboxWidthRatio: 0.58,
  hitboxHeightRatio: 0.84,

  minObstacleGap: 300,
  maxObstacleGap: 520
};
