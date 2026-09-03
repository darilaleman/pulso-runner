// src/cubaplay/WebTestPlatform.ts

import { GamePlatform, GameResult } from './GamePlatform';

export class WebTestPlatform implements GamePlatform {
  async initialize(): Promise<void> { console.log('[WebTest] Plataforma lista'); }
  async getPlayer() { return { id: 'test-user', displayName: 'Jugador Web' }; }
  async startGame() { return { sessionId: 'session-' + Date.now() }; }
  
  async submitResult(result: GameResult): Promise<void> {
    console.log('JUEGO TERMINADO');
    console.log('Puntos: ' + result.score);
    //alert('Fin! Puntos: ' + result.score);
  }
  
  exitGame() { /* No hacemos nada para no recargar */ }
}