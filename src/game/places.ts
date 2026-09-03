// src/game/places.ts

export interface Place {
  id: string;
  name: string;
  backgroundKey: string;
  targetScore: number;
  emoji: string;            // Para mostrar en el menú
  color: string;            // Color de la tarjeta en el menú
}

export interface Progress {
  unlocked: string[];       // IDs de lugares desbloqueados
  completed: string[];      // IDs de lugares completados (victoria)
  highScores: Record<string, number>;
}

// Definición de lugares (el primero es el modo infinito, siempre disponible)
export const PLACES: Place[] = [
  { id: 'infinito', name: 'Modo Infinito', backgroundKey: 'fondo', targetScore: 0, emoji: '♾️', color: '#8e44ad' },
  { id: 'cav',   name: 'Ciego de Ávila',   backgroundKey: 'cav-bg', targetScore: 200, emoji: '🌳', color: '#27ae60' },
  { id: 'mtz', name: 'Matanzas', backgroundKey: 'mtz-bg', targetScore: 400, emoji: '🏜️', color: '#f39c12' },
  { id: 'cmg',   name: 'Camagüey ',   backgroundKey: 'cmg-bg',   targetScore: 500, emoji: '🏙️', color: '#3498db' },
  { id: 'vcl',   name: 'Villa Clara',   backgroundKey: 'vcl-bg', targetScore: 550, emoji: '🌋', color: '#e74c3c' },
  { id: 'hlg',   name: 'Holguín',   backgroundKey: 'hlg-bg', targetScore: 600, emoji: '�️', color: '#f1c40f' },
  { id: 'cfg',   name: 'Cienfuegos',   backgroundKey: 'cfg-bg', targetScore: 650, emoji: '🌋', color: '#e74c3c' },
  { id: 'pri',   name: 'Pinar del Río',   backgroundKey: 'pri-bg', targetScore: 650, emoji: '🌋', color: '#e74c3c' },
  { id: 'art',   name: 'Artemisa ',   backgroundKey: 'art-bg', targetScore: 650, emoji: '🌋', color: '#e74c3c' },
  { id: 'myb',   name: 'Mayabeque ',   backgroundKey: 'myb-bg', targetScore: 650, emoji: '🌋', color: '#e74c3c' },
  { id: 'ssp',   name: 'Sancti Spíritus',   backgroundKey: 'ssp-bg', targetScore: 650, emoji: '🌋', color: '#e74c3c' },
  { id: 'ltn',   name: 'Las Tunas',   backgroundKey: 'ltn-bg', targetScore: 650, emoji: '🌋', color: '#e74c3c' },
  { id: 'grm',   name: 'Granma ',   backgroundKey: 'grm-bg', targetScore: 650, emoji: '🌋', color: '#e74c3c' },
  { id: 'stg',   name: 'Santiago de Cuba',   backgroundKey: 'stg-bg', targetScore: 650, emoji: '🌋', color: '#e74c3c' },
  { id: 'gtm',   name: 'Guantánamo ',   backgroundKey: 'gtm-bg', targetScore: 700, emoji: '🌋', color: '#e74c3c' },
  { id: 'ijv',   name: 'Isla de la Juventud',   backgroundKey: 'ijv-bg', targetScore: 750, emoji: '🌋', color: '#e74c3c' },
  { id: 'lha',   name: 'La Habana',   backgroundKey: 'lha-bg', targetScore: 800, emoji: '🌋', color: '#e74c3c' },
];

const STORAGE_KEY = 'pulso_runner_progress';

export function loadProgress(): Progress {
  const stored = localStorage.getItem(STORAGE_KEY);
  let progress: Progress | null = null;

  if (stored) {
    try {
      progress = JSON.parse(stored);
    } catch {
      progress = null;
    }
  }

  if (!progress) {
    progress = { unlocked: [], completed: [], highScores: {} };
  }

  // Por si el storage viene de una versión anterior del juego
  progress.unlocked = Array.isArray(progress.unlocked) ? progress.unlocked : [];
  progress.completed = Array.isArray(progress.completed) ? progress.completed : [];
  progress.highScores = progress.highScores ?? {};

  // El modo infinito y el primer mapa jugable siempre deben estar desbloqueados
  const firstPlayable = PLACES.find(p => p.id !== 'infinito');
  const siempreDesbloqueados = ['infinito', firstPlayable?.id].filter(Boolean) as string[];

  for (const id of siempreDesbloqueados) {
    if (!progress.unlocked.includes(id)) {
      progress.unlocked.push(id);
    }
  }

  return progress;
}

export function saveProgress(progress: Progress): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function getUnlockedPlaces(progress: Progress): Place[] {
  return PLACES.filter(p => progress.unlocked.includes(p.id));
}

export function isPlaceCompleted(progress: Progress, placeId: string): boolean {
  return progress.completed.includes(placeId);
}

export function getPlaceById(id: string): Place | undefined {
  return PLACES.find(p => p.id === id);
}

/**
 * Actualiza el progreso tras una partida.
 * - Actualiza el high score.
 * - Si el lugar NO estaba completado y se alcanza la meta, se marca como completado
 *   y se desbloquea el siguiente lugar (si existe).
 * - Si el lugar YA estaba completado, NO se desbloquea nada adicional.
 */
export function updatePlaceScore(placeId: string, score: number, progress: Progress): Progress {
  // Actualizar high score
  if (!progress.highScores[placeId] || score > progress.highScores[placeId]) {
    progress.highScores[placeId] = score;
  }

  // Si es infinito, no se considera completable
  if (placeId === 'infinito') {
    saveProgress(progress);
    return progress;
  }

  const place = PLACES.find(p => p.id === placeId);
  if (!place) return progress;

  // Solo desbloquear si el lugar no estaba completado previamente
  const alreadyCompleted = progress.completed.includes(placeId);
  if (!alreadyCompleted && score >= place.targetScore) {
    // Marcar como completado
    progress.completed.push(placeId);

    // Desbloquear el siguiente lugar (si existe y no está ya desbloqueado)
    const currentIndex = PLACES.findIndex(p => p.id === placeId);
    const nextIndex = currentIndex + 1;
    if (nextIndex < PLACES.length) {
      const nextPlace = PLACES[nextIndex];
      if (!progress.unlocked.includes(nextPlace.id)) {
        progress.unlocked.push(nextPlace.id);
      }
    }
  }

  saveProgress(progress);
  return progress;
}

/**
 * Devuelve el primer lugar desbloqueado pero no completado (siguiente a jugar).
 * Retorna null si no hay más.
 */
export function getNextPlace(progress: Progress): Place | null {
  for (const place of PLACES) {
    if (place.id === 'infinito') continue;
    if (progress.unlocked.includes(place.id) && !progress.completed.includes(place.id)) {
      return place;
    }
  }
  return null;
}