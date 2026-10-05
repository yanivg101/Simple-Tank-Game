'use client';

import { useEffect, useRef, useCallback } from 'react';

interface KeysState {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
}

interface MouseState {
  x: number;
  y: number;
  down: boolean;
}

interface UseInputOptions {
  gameStarted: boolean;
  gameEnded: boolean;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
  onRightClick: () => void;
  gameMode: 'battle' | 'survival';
}

export function useInput({
  gameStarted,
  gameEnded,
  isPaused,
  setIsPaused,
  onRightClick,
  gameMode,
}: UseInputOptions) {
  const keysRef = useRef<KeysState>({ w: false, a: false, s: false, d: false });
  const mouseRef = useRef<MouseState>({ x: 0, y: 0, down: false });
  const gameStartedRef = useRef(gameStarted);
  const gameEndedRef = useRef(gameEnded);
  const isPausedRef = useRef(isPaused);

  gameStartedRef.current = gameStarted;
  gameEndedRef.current = gameEnded;
  isPausedRef.current = isPaused;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        e.preventDefault();
        if (isPausedRef.current) {
          setIsPaused(false);
        } else if (gameStartedRef.current && !gameEndedRef.current) {
          setIsPaused(true);
        }
        return;
      }
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keysRef.current.w = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keysRef.current.s = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keysRef.current.a = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keysRef.current.d = true;
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          keysRef.current.w = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          keysRef.current.s = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          keysRef.current.a = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          keysRef.current.d = false;
          break;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };

    const handleMouseDown = (e: MouseEvent) => {
      mouseRef.current.down = true;
      if (e.button === 2) {
        e.preventDefault();
        onRightClick();
      }
    };

    const handleMouseUp = () => {
      mouseRef.current.down = false;
    };

    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [gameMode, setIsPaused, onRightClick]);

  return {
    keys: keysRef.current,
    mouse: mouseRef.current,
  };
}