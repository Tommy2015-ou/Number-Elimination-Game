/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Play, 
  Timer, 
  Zap, 
  Pause, 
  Home,
  ChevronLeft,
  AlertCircle
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { GameMode, BlockData } from './types';

const GRID_ROWS = 8;
const GRID_COLS = 6;
const INITIAL_ROWS = 4;
const TIME_LIMIT = 10; // Seconds per row in Time Mode

const generateId = () => Math.random().toString(36).substring(2, 9);
const getRandomValue = () => Math.floor(Math.random() * 9) + 1;

export default function App() {
  const [mode, setMode] = useState<GameMode | null>(null);
  const [grid, setGrid] = useState<BlockData[]>([]);
  const [targetSum, setTargetSum] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIME_LIMIT);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load High Score
  useEffect(() => {
    const saved = localStorage.getItem('summatch_highscore');
    if (saved) setHighScore(parseInt(saved));
  }, []);

  // Save High Score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('summatch_highscore', score.toString());
    }
  }, [score, highScore]);

  const generateTarget = useCallback((currentGrid: BlockData[]) => {
    if (currentGrid.length === 0) return 10;
    // Pick 2-3 random blocks and sum them to ensure it's possible
    const count = Math.min(currentGrid.length, Math.floor(Math.random() * 2) + 2);
    const shuffled = [...currentGrid].sort(() => 0.5 - Math.random());
    const sum = shuffled.slice(0, count).reduce((acc, b) => acc + b.value, 0);
    return sum;
  }, []);

  const addRow = useCallback(() => {
    setGrid(prev => {
      // Check if any block is in the top row (row 0)
      const isTopOccupied = prev.some(b => b.row === 0);
      if (isTopOccupied) {
        setGameOver(true);
        return prev;
      }

      // Shift existing blocks up
      const shifted = prev.map(b => ({ ...b, row: b.row - 1 }));
      
      // Add new row at the bottom (row 7)
      const newRow: BlockData[] = Array.from({ length: GRID_COLS }).map((_, col) => ({
        id: generateId(),
        value: getRandomValue(),
        row: GRID_ROWS - 1,
        col,
        isSelected: false
      }));

      return [...shifted, ...newRow];
    });
    
    if (mode === GameMode.TIME) {
      setTimeLeft(TIME_LIMIT);
    }
  }, [mode]);

  const initGame = (selectedMode: GameMode) => {
    const initialGrid: BlockData[] = [];
    for (let r = GRID_ROWS - INITIAL_ROWS; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        initialGrid.push({
          id: generateId(),
          value: getRandomValue(),
          row: r,
          col: c,
          isSelected: false
        });
      }
    }
    setGrid(initialGrid);
    setTargetSum(generateTarget(initialGrid));
    setScore(0);
    setGameOver(false);
    setMode(selectedMode);
    setTimeLeft(TIME_LIMIT);
    setSelectedIds([]);
    setIsPaused(false);
  };

  // Timer logic for Time Mode
  useEffect(() => {
    if (mode === GameMode.TIME && !gameOver && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            addRow();
            return TIME_LIMIT;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [mode, gameOver, isPaused, addRow]);

  const currentSum = grid
    .filter(b => selectedIds.includes(b.id))
    .reduce((acc, b) => acc + b.value, 0);

  const handleBlockClick = (id: string) => {
    if (gameOver || isPaused) return;

    setSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(i => i !== id);
      }
      return [...prev, id];
    });
  };

  useEffect(() => {
    if (currentSum === targetSum && selectedIds.length > 0) {
      // Success!
      const points = selectedIds.length * 10;
      setScore(s => s + points);
      
      // Remove selected blocks
      const newGrid = grid.filter(b => !selectedIds.includes(b.id));
      
      // Gravity: blocks fall down
      // For each column, find blocks and reassign rows
      const finalGrid: BlockData[] = [];
      for (let c = 0; c < GRID_COLS; c++) {
        const colBlocks = newGrid
          .filter(b => b.col === c)
          .sort((a, b) => b.row - a.row); // Bottom to top
        
        colBlocks.forEach((b, idx) => {
          finalGrid.push({
            ...b,
            row: GRID_ROWS - 1 - idx
          });
        });
      }

      setGrid(finalGrid);
      setSelectedIds([]);
      setTargetSum(generateTarget(finalGrid));

      if (mode === GameMode.CLASSIC) {
        addRow();
      }

      if (points >= 30) {
        confetti({
          particleCount: 40,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#10b981', '#34d399', '#6ee7b7']
        });
      }
    } else if (currentSum > targetSum) {
      // Failed - clear selection
      setSelectedIds([]);
    }
  }, [currentSum, targetSum, selectedIds, grid, mode, addRow, generateTarget]);

  if (!mode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-zinc-950">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-8 max-w-md w-full"
        >
          <div className="space-y-2">
            <h1 className="text-6xl font-bold tracking-tighter text-emerald-500 italic font-mono">
              SUM<span className="text-zinc-100">MATCH</span>
            </h1>
            <p className="text-zinc-400 text-sm uppercase tracking-[0.2em]">数学求和消除</p>
          </div>

          <div className="grid gap-4">
            <button 
              onClick={() => initGame(GameMode.CLASSIC)}
              className="group relative flex items-center justify-between p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-emerald-500/50 transition-all text-left"
            >
              <div>
                <h3 className="text-xl font-bold text-zinc-100">经典模式</h3>
                <p className="text-zinc-500 text-sm">每次成功后新增一行。挑战生存极限。</p>
              </div>
              <Zap className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
            </button>

            <button 
              onClick={() => initGame(GameMode.TIME)}
              className="group relative flex items-center justify-between p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-emerald-500/50 transition-all text-left"
            >
              <div>
                <h3 className="text-xl font-bold text-zinc-100">计时模式</h3>
                <p className="text-zinc-500 text-sm">每 {TIME_LIMIT} 秒新增一行。手速要快！</p>
              </div>
              <Timer className="w-8 h-8 text-emerald-500 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          <div className="pt-8 border-t border-zinc-900">
            <div className="flex items-center justify-center gap-2 text-zinc-500">
              <Trophy className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest">最高分: {highScore}</span>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center p-4 md:p-8">
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-8">
        <button 
          onClick={() => setMode(null)}
          className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-500"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        
        <div className="text-center">
          <div className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-1">
            {mode === GameMode.CLASSIC ? '经典生存' : '计时挑战'}
          </div>
          <div className="text-2xl font-mono font-bold text-zinc-100">
            {score.toString().padStart(6, '0')}
          </div>
        </div>

        <button 
          onClick={() => setIsPaused(!isPaused)}
          className="p-2 hover:bg-zinc-900 rounded-full transition-colors text-zinc-500"
        >
          {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
        </button>
      </div>

      {/* Target Display */}
      <div className="w-full max-w-md mb-8 relative">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col items-center justify-center shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-zinc-800">
            {mode === GameMode.TIME && (
              <motion.div 
                className="h-full bg-emerald-500"
                initial={{ width: '100%' }}
                animate={{ width: `${(timeLeft / TIME_LIMIT) * 100}%` }}
                transition={{ duration: 1, ease: 'linear' }}
              />
            )}
          </div>
          
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500 mb-2">目标数字</div>
          <motion.div 
            key={targetSum}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-7xl font-mono font-bold text-emerald-500"
          >
            {targetSum}
          </motion.div>
          
          <div className="mt-4 flex items-center gap-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase text-zinc-600">当前和</span>
              <span className={`text-xl font-mono font-bold ${currentSum > targetSum ? 'text-red-500' : 'text-zinc-300'}`}>
                {currentSum}
              </span>
            </div>
            <div className="w-px h-8 bg-zinc-800" />
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase text-zinc-600">已选数</span>
              <span className="text-xl font-mono font-bold text-zinc-300">
                {selectedIds.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Game Grid */}
      <div className="relative w-full max-w-md aspect-[6/8] bg-zinc-900/50 rounded-2xl border border-zinc-900 p-2">
        <div className="game-grid h-full">
          <AnimatePresence>
            {grid.map((block) => (
              <motion.button
                key={block.id}
                layoutId={block.id}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ 
                  scale: 1, 
                  opacity: 1,
                  gridRowStart: block.row + 1,
                  gridColumnStart: block.col + 1
                }}
                exit={{ scale: 0, opacity: 0 }}
                onClick={() => handleBlockClick(block.id)}
                className={`
                  relative flex items-center justify-center rounded-xl text-2xl font-mono font-bold transition-all duration-200
                  ${selectedIds.includes(block.id) 
                    ? 'selected-block' 
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:bg-zinc-700'}
                `}
              >
                {block.value}
              </motion.button>
            ))}
          </AnimatePresence>
        </div>

        {/* Pause Overlay */}
        <AnimatePresence>
          {isPaused && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-10 bg-zinc-950/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center p-6 text-center"
            >
              <Pause className="w-16 h-16 text-emerald-500 mb-4" />
              <h2 className="text-3xl font-bold mb-6">游戏暂停</h2>
              <button 
                onClick={() => setIsPaused(false)}
                className="w-full py-4 bg-emerald-500 text-emerald-950 font-bold rounded-xl hover:bg-emerald-400 transition-colors"
              >
                继续游戏
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Over Overlay */}
        <AnimatePresence>
          {gameOver && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute inset-0 z-20 bg-zinc-950/95 backdrop-blur-md rounded-2xl flex flex-col items-center justify-center p-8 text-center"
            >
              <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
              <h2 className="text-4xl font-bold mb-2">游戏结束</h2>
              <p className="text-zinc-500 mb-8">方块已经堆到顶部了！</p>
              
              <div className="w-full space-y-4 mb-8">
                <div className="flex justify-between items-center p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 uppercase text-xs tracking-widest">最终得分</span>
                  <span className="text-2xl font-mono font-bold text-emerald-500">{score}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-zinc-900 rounded-xl border border-zinc-800">
                  <span className="text-zinc-500 uppercase text-xs tracking-widest">最高分</span>
                  <span className="text-2xl font-mono font-bold text-zinc-300">{highScore}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                  onClick={() => initGame(mode!)}
                  className="flex items-center justify-center gap-2 py-4 bg-emerald-500 text-emerald-950 font-bold rounded-xl hover:bg-emerald-400 transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                  重试
                </button>
                <button 
                  onClick={() => setMode(null)}
                  className="flex items-center justify-center gap-2 py-4 bg-zinc-800 text-zinc-100 font-bold rounded-xl hover:bg-zinc-700 transition-colors"
                >
                  <Home className="w-5 h-5" />
                  菜单
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Instructions */}
      <div className="mt-8 text-center max-w-xs">
        <p className="text-zinc-600 text-xs leading-relaxed uppercase tracking-wider">
          选择数字使它们的总和等于目标数字。 <br />
          不要让方块堆积到顶部！
        </p>
      </div>
    </div>
  );
}
