import { isInCheck } from "./board";
import { applyMove, generateAllLegalMoves } from "./moves";
import type { Color, GameState, Move, PieceType } from "./types";
import { fileOf, rankOf } from "./types";

const PIECE_VALUES: Record<PieceType, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Standard-ish piece-square tables, from White's perspective (rank 0 = rank 1).
// Indexed [rank][file], small values in centipawns.
const PAWN_TABLE = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [5, 10, 10, -20, -20, 10, 10, 5],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [0, 0, 0, 20, 20, 0, 0, 0],
  [5, 5, 10, 25, 25, 10, 5, 5],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_TABLE = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_TABLE = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 5, 0, 0, 0, 0, 5, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 0, 10, 10, 10, 10, 0, -10],
  [-10, 5, 5, 10, 10, 5, 5, -10],
  [-10, 0, 5, 10, 10, 5, 0, -10],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_TABLE = [
  [0, 0, 0, 5, 5, 0, 0, 0],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [5, 10, 10, 10, 10, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const QUEEN_TABLE = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_TABLE = [
  [20, 30, 10, 0, 0, 10, 30, 20],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
];

const TABLES: Record<PieceType, number[][]> = {
  p: PAWN_TABLE,
  n: KNIGHT_TABLE,
  b: BISHOP_TABLE,
  r: ROOK_TABLE,
  q: QUEEN_TABLE,
  k: KING_TABLE,
};

function evaluate(state: GameState): number {
  let score = 0;
  for (let sq = 0; sq < 64; sq++) {
    const piece = state.board[sq];
    if (!piece) continue;
    const rank = rankOf(sq);
    const file = fileOf(sq);
    const tableRank = piece.color === "w" ? rank : 7 - rank;
    const positional = TABLES[piece.type][tableRank][file];
    const value = PIECE_VALUES[piece.type] + positional;
    score += piece.color === "w" ? value : -value;
  }
  return score;
}

function orderMoves(moves: Move[]): Move[] {
  return [...moves].sort((a, b) => {
    const aScore = a.captured ? PIECE_VALUES[a.captured.type] - PIECE_VALUES[a.piece.type] / 10 : 0;
    const bScore = b.captured ? PIECE_VALUES[b.captured.type] - PIECE_VALUES[b.piece.type] / 10 : 0;
    return bScore - aScore;
  });
}

interface SearchResult {
  move: Move | null;
  score: number;
  nodes: number;
}

function negamax(
  state: GameState,
  depth: number,
  alpha: number,
  beta: number,
  color: 1 | -1,
  nodeCounter: { count: number },
): number {
  nodeCounter.count++;
  const moves = generateAllLegalMoves(state);

  if (moves.length === 0) {
    if (isInCheck(state.board, state.turn)) return -100000 + (4 - depth) * -1;
    return 0; // stalemate
  }

  if (depth === 0) {
    return color * evaluate(state);
  }

  let best = -Infinity;
  for (const move of orderMoves(moves)) {
    const next = applyMove(state, move);
    const score = -negamax(next, depth - 1, -beta, -alpha, (color * -1) as 1 | -1, nodeCounter);
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function findBestMove(state: GameState, depth: number): SearchResult {
  const moves = generateAllLegalMoves(state);
  const nodeCounter = { count: 0 };
  const color: 1 | -1 = state.turn === "w" ? 1 : -1;

  let bestMove: Move | null = null;
  let bestScore = -Infinity;
  let alpha = -Infinity;
  const beta = Infinity;

  for (const move of orderMoves(moves)) {
    const next = applyMove(state, move);
    const score = -negamax(next, depth - 1, -beta, -alpha, (color * -1) as 1 | -1, nodeCounter);
    if (score > bestScore || bestMove === null) {
      bestScore = score;
      bestMove = move;
    }
    if (bestScore > alpha) alpha = bestScore;
  }

  return { move: bestMove, score: bestScore, nodes: nodeCounter.count };
}

export function pickRandomMove(state: GameState): Move | null {
  const moves = generateAllLegalMoves(state);
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

export type Difficulty = "easy" | "medium" | "hard";

export function difficultyToDepth(difficulty: Difficulty): number {
  switch (difficulty) {
    case "easy":
      return 1;
    case "medium":
      return 2;
    case "hard":
      return 3;
  }
}

export function chooseEngineMove(state: GameState, difficulty: Difficulty): Move | null {
  if (difficulty === "easy" && Math.random() < 0.35) {
    return pickRandomMove(state);
  }
  const depth = difficultyToDepth(difficulty);
  return findBestMove(state, depth).move;
}

export function colorToMove(state: GameState): Color {
  return state.turn;
}
