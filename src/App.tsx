/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, FastForward, VolumeX, RotateCcw } from 'lucide-react';

const GRID_SIZE = 20;
const CELL_SIZE = 20; // 20px per cell = 400x400 total
const TICK_RATE = 120; // ms per tick

const MUSIC_TRACKS = [
  { id: 1, title: 'AI_GEN: Neon Drift.wav', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 2, title: 'AI_GEN: Cyberpunk City.wav', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 3, title: 'AI_GEN: Digital Horizon.wav', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3' },
];

type Point = { x: number; y: number };

export default function App() {
  // Game State
  const [snake, setSnake] = useState<Point[]>([{ x: 10, y: 10 }, { x: 10, y: 11 }]);
  const [direction, setDirection] = useState<Point>({ x: 0, y: -1 });
  const [food, setFood] = useState<Point>({ x: 15, y: 5 });
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Music State
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Use a ref for direction to avoid rapid multi-key input causing snake to reverse
  const directionRef = useRef(direction);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  // Audio setup
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio(MUSIC_TRACKS[currentTrackIndex].url);
      audioRef.current.loop = false; // We handle "ended" to skip track
    } else {
      audioRef.current.src = MUSIC_TRACKS[currentTrackIndex].url;
    }
    
    if (isMusicPlaying) {
      audioRef.current.play().catch((e) => console.error("Audio playback prevented:", e));
    }

    return () => {
      // Don't completely destroy on unmount, but pause
      audioRef.current?.pause();
    };
  }, [currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      const handleEnded = () => skipTrack();
      audioRef.current.addEventListener('ended', handleEnded);
      return () => audioRef.current?.removeEventListener('ended', handleEnded);
    }
  }, []);

  const toggleMusic = () => {
    if (isMusicPlaying) {
      audioRef.current?.pause();
      setIsMusicPlaying(false);
    } else {
      audioRef.current?.play().catch((e) => console.error("Audio playback prevented:", e));
      setIsMusicPlaying(true);
    }
  };

  const skipTrack = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % MUSIC_TRACKS.length);
  };

  const generateFood = (currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      // Make sure food is not generated on the snake body
      // eslint-disable-next-line no-loop-func
      const isOnSnake = currentSnake.some((s) => s.x === newFood.x && s.y === newFood.y);
      if (!isOnSnake) break;
    }
    return newFood;
  };

  // Main Game Loop
  useEffect(() => {
    if (!isPlaying || isGameOver) return;

    const moveSnake = () => {
      setSnake((prevSnake) => {
        const head = prevSnake[0];
        const newHead = {
          x: head.x + directionRef.current.x,
          y: head.y + directionRef.current.y,
        };

        // Check Wall Collision
        if (
          newHead.x < 0 ||
          newHead.x >= GRID_SIZE ||
          newHead.y < 0 ||
          newHead.y >= GRID_SIZE
        ) {
          setIsGameOver(true);
          return prevSnake;
        }

        // Check Self Collision
        if (prevSnake.some((segment) => segment.x === newHead.x && segment.y === newHead.y)) {
          setIsGameOver(true);
          return prevSnake;
        }

        const newSnake = [newHead, ...prevSnake];

        // Check Food Collision
        if (newHead.x === food.x && newHead.y === food.y) {
          setScore((s) => s + 10);
          setFood(generateFood(newSnake));
          // Don't pop tail when food is eaten
        } else {
          newSnake.pop(); // Remove tail
        }

        return newSnake;
      });
    };

    const intervalId = setInterval(moveSnake, TICK_RATE);
    return () => clearInterval(intervalId);
  }, [isPlaying, isGameOver, food]);

  // Keyboard Handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for game keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      if (!isPlaying) {
        if (e.key === 'Enter' || e.key === ' ') {
          if (isGameOver) resetGame();
          else setIsPlaying(true);
        }
        return; // Game paused/idle, don't update direction
      }

      const { x, y } = directionRef.current;

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          if (y !== 1) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          if (y !== -1) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          if (x !== 1) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          if (x !== -1) setDirection({ x: 1, y: 0 });
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isGameOver]);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }, { x: 10, y: 11 }]);
    setDirection({ x: 0, y: -1 });
    setFood({ x: 15, y: 5 });
    setScore(0);
    setIsGameOver(false);
    setIsPlaying(true);
  };

  return (
    <div className="w-full h-full min-h-screen bg-black text-cyan-400 font-mono flex flex-col items-center justify-center p-4 relative overflow-hidden crt">
      {/* Immersive background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-cyan-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Header */}
      <div className="z-10 mb-6 flex flex-col items-center space-y-3">
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter neon-text-pink uppercase">
          Neon Serpent
        </h1>
        <div className="text-lg md:text-xl neon-text-cyan flex items-center space-x-6 bg-cyan-950/40 px-6 py-2 rounded-full border border-cyan-500/30">
          <span className="font-bold tracking-widest">SCORE: {score.toString().padStart(4, '0')}</span>
          <span className="text-pink-500 opacity-50 font-bold">|</span>
          <span className="uppercase text-sm tracking-widest font-bold">
            {isGameOver ? 'SYS_FAIL' : isPlaying ? 'ACTIVE' : 'IDLE'}
          </span>
        </div>
      </div>

      {/* Main Game Canvas/Grid with dual border aesthetic */}
      <div className="z-10 relative border-4 border-cyan-500/80 rounded-xl p-2 mb-8 bg-black shadow-[0_0_40px_rgba(0,255,255,0.2)] flex-shrink-0">
        <div className="border-4 border-pink-500/60 p-1">
          <div 
            className="relative game-bg-grid overflow-hidden bg-black"
            style={{ width: `${GRID_SIZE * CELL_SIZE}px`, height: `${GRID_SIZE * CELL_SIZE}px` }}
          >
          {/* Food */}
          <div 
            className="absolute bg-pink-500 rounded-sm shadow-[0_0_12px_#ff00ff]"
            style={{
               left: `${food.x * CELL_SIZE}px`, 
               top: `${food.y * CELL_SIZE}px`,
               width: `${CELL_SIZE}px`,
               height: `${CELL_SIZE}px`
            }}
          />

          {/* Snake */}
          {snake.map((segment, idx) => {
             const isHead = idx === 0;
             return (
               <div
                 key={`${segment.x}-${segment.y}-${idx}`}
                 className={`absolute rounded-sm transition-all duration-75 ${
                   isHead 
                     ? 'bg-white z-10 shadow-[0_0_15px_#00ffff] border border-cyan-300' 
                     : 'bg-cyan-500 border border-cyan-800 opacity-90'
                 }`}
                 style={{
                   left: `${segment.x * CELL_SIZE}px`, 
                   top: `${segment.y * CELL_SIZE}px`,
                   width: `${CELL_SIZE}px`,
                   height: `${CELL_SIZE}px`
                 }}
               />
             )
          })}

          {/* Game Over / Start Overlays */}
          {!isPlaying && !isGameOver && (
             <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                <p className="neon-text-cyan text-lg md:text-xl mb-6 font-bold animate-pulse text-center px-4">
                   PRESS ENTER OR SPACE TO START
                   <br/>
                   <span className="text-sm opacity-70 block mt-2 text-pink-400">Use Arrow Keys or WASD to Move</span>
                </p>
                <button 
                  onClick={() => setIsPlaying(true)} 
                  className="neon-box-pink px-8 py-3 text-pink-400 font-bold uppercase tracking-widest transition-all hover:bg-pink-900/60 hover:scale-105 active:scale-95"
                >
                  Initialize_Sequence
                </button>
             </div>
          )}

      {isGameOver && (
        <div className="absolute inset-0 bg-[#0a050a]/95 backdrop-blur-md flex flex-col items-center justify-center text-center z-20 border-4 border-pink-500/80">
          <p className="neon-text-pink text-4xl md:text-5xl mb-4 font-black uppercase tracking-[0.2em] animate-pulse">
            SYSTEM FAILURE
          </p>
          <p className="text-white/80 text-xl mb-12 font-bold tracking-[0.15em] uppercase">
            FINAL SCORE: [{score}]
          </p>
          <button 
            onClick={resetGame} 
            className="border-2 border-cyan-400 px-10 py-4 text-cyan-400 font-black uppercase tracking-[0.3em] hover:bg-cyan-400 hover:text-black transition-all duration-300 shadow-[0_0_20px_rgba(0,255,255,0.4)] hover:shadow-[0_0_30px_rgba(0,255,255,1)] active:scale-95 bg-black/40"
          >
            REBOOT_SYSTEM
          </button>
        </div>
      )}
        </div>
      </div>
    </div>

      {/* Music Player Module */}
      <div className="z-10 neon-box-pink rounded-xl p-5 w-full max-w-[424px] flex flex-col space-y-5 bg-black/80 shadow-[0_0_30px_rgba(255,0,255,0.15)] flex-shrink-0">
        <div className="flex justify-between items-start border-b border-pink-500/30 pb-3">
           <div className="flex flex-col">
              <span className="text-[10px] text-pink-500 font-black tracking-[0.2em] uppercase mb-1">
                 Module // Audio.AI
              </span>
              <span className="text-sm font-bold text-gray-100 overflow-hidden whitespace-nowrap text-ellipsis max-w-[220px]" title={MUSIC_TRACKS[currentTrackIndex].title}>
                {'>'} {MUSIC_TRACKS[currentTrackIndex].title}
              </span>
           </div>
           
           <div className="flex items-center text-cyan-400 h-6">
             {isMusicPlaying ? (
               <div className="flex space-x-1 items-end h-4 w-6">
                 <div className="w-1 bg-cyan-400 animate-[pulse_0.5s_infinite] h-full" style={{ animationDelay: '0ms' }}></div>
                 <div className="w-1 bg-cyan-400 animate-[pulse_0.7s_infinite] h-2" style={{ animationDelay: '100ms' }}></div>
                 <div className="w-1 bg-cyan-400 animate-[pulse_0.6s_infinite] h-3" style={{ animationDelay: '200ms' }}></div>
               </div>
             ) : (
                <VolumeX className="w-5 h-5 opacity-40 text-pink-500" />
             )}
           </div>
        </div>

        <div className="flex justify-between items-center px-2">
          <button 
             onClick={toggleMusic} 
             className="w-14 h-14 rounded-full border-2 border-pink-500 flex items-center justify-center text-pink-400 hover:bg-pink-500 hover:text-black transition-all shadow-[0_0_15px_rgba(255,0,255,0.4)] hover:shadow-[0_0_20px_rgba(255,0,255,0.8)] active:scale-95"
          >
             {isMusicPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
          </button>
          
          <button 
             onClick={skipTrack}
             className="flex items-center space-x-3 px-5 py-2.5 border border-cyan-500/50 rounded-lg hover:bg-cyan-500/20 text-cyan-400 transition-all hover:shadow-[0_0_15px_rgba(0,255,255,0.3)] active:scale-95 group"
          >
            <span className="text-xs uppercase tracking-[0.2em] font-bold">Skip_Track</span>
            <FastForward className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
      
    </div>
  );
}
