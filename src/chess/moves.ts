import { cloneBoard, findKing, isInCheck, isSquareAttacked } from "./board";
import { offsideBoundary, isOnside } from "./offside";
import {
  type Board,
  type CastlingRights,
  type Color,
  type GameState,
  type Move,
  type PieceType,
  type Square,
  fileOf,
  rankOf,
  squareOf,
  inBounds,
  otherColor,
} from "./types";

const KNIGHT_DELTAS = [
  [1, 2],
  [2, 1],
  [2, -1],
  [1, -2],
  [-1, -2],
  [-2, -1],
  [-2, 1],
  [-1, 2],
];

const KING_DELTAS = [
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
  [0, -1],
  [1, -1],
];

const BISHOP_DIRS = [
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

const ROOK_DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

const PROMOTION_TYPES: PieceType[] = ["q", "r", "b", "n"];

function pseudoLegalPawnMoves(state: GameState, from: Square): Move[] {
  const { board, turn, enPassant } = state;
  const piece = board[from];
  if (!piece) return [];
  const moves: Move[] = [];
  const f = fileOf(from);
  const r = rankOf(from);
  const dir = turn === "w" ? 1 : -1;
  const startRank = turn === "w" ? 1 : 6;
  const promotionRank = turn === "w" ? 7 : 0;

  const addPawnMove = (to: Square, captured: Move["captured"], extra: Partial<Move> = {}) => {
    const toRank = rankOf(to);
    if (toRank === promotionRank) {
      for (const promo of PROMOTION_TYPES) {
        moves.push({ from, to, piece, captured, promotion: promo, ...extra });
      }
    } else {
      moves.push({ from, to, piece, captured, ...extra });
    }
  };

  // Single push
  const oneStepRank = r + dir;
  if (inBounds(f, oneStepRank)) {
    const oneStep = squareOf(f, oneStepRank);
    if (!board[oneStep]) {
      addPawnMove(oneStep, null);

      // Double push
      if (r === startRank) {
        const twoStepRank = r + dir * 2;
        const twoStep = squareOf(f, twoStepRank);
        if (!board[twoStep]) {
          moves.push({ from, to: twoStep, piece, captured: null, isDoublePawnPush: true });
        }
      }
    }
  }

  // Captures
  for (const df of [-1, 1]) {
    const nf = f + df;
    const nr = r + dir;
    if (!inBounds(nf, nr)) continue;
    const to = squareOf(nf, nr);
    const target = board[to];
    if (target && target.color !== turn) {
      addPawnMove(to, target);
    } else if (!target && enPassant === to) {
      const capturedSq = squareOf(nf, r);
      const captured = board[capturedSq];
      moves.push({ from, to, piece, captured, isEnPassant: true });
    }
  }

  return moves;
}

function slidingMoves(board: Board, from: Square, dirs: number[][], color: Color): Move[] {
  const piece = board[from];
  if (!piece) return [];
  const moves: Move[] = [];
  const f = fileOf(from);
  const r = rankOf(from);

  for (const [df, dr] of dirs) {
    let nf = f + df;
    let nr = r + dr;
    while (inBounds(nf, nr)) {
      const to = squareOf(nf, nr);
      const target = board[to];
      if (!target) {
        moves.push({ from, to, piece, captured: null });
      } else {
        if (target.color !== color) {
          moves.push({ from, to, piece, captured: target });
        }
        break;
      }
      nf += df;
      nr += dr;
    }
  }
  return moves;
}

function steppingMoves(board: Board, from: Square, deltas: number[][], color: Color): Move[] {
  const piece = board[from];
  if (!piece) return [];
  const moves: Move[] = [];
  const f = fileOf(from);
  const r = rankOf(from);

  for (const [df, dr] of deltas) {
    const nf = f + df;
    const nr = r + dr;
    if (!inBounds(nf, nr)) continue;
    const to = squareOf(nf, nr);
    const target = board[to];
    if (!target || target.color !== color) {
      moves.push({ from, to, piece, captured: target ?? null });
    }
  }
  return moves;
}

function castlingMoves(state: GameState, from: Square): Move[] {
  const { board, turn, castling } = state;
  const piece = board[from];
  if (!piece || piece.type !== "k") return [];
  const moves: Move[] = [];
  const rank = turn === "w" ? 0 : 7;
  const opponent = otherColor(turn);

  if (isSquareAttacked(board, from, opponent)) return moves; // can't castle out of check

  const canCastleKingside = turn === "w" ? castling.wK : castling.bK;
  if (canCastleKingside) {
    const f1 = squareOf(5, rank);
    const f2 = squareOf(6, rank);
    const rookSq = squareOf(7, rank);
    const rook = board[rookSq];
    if (
      !board[f1] &&
      !board[f2] &&
      rook &&
      rook.type === "r" &&
      rook.color === turn &&
      !isSquareAttacked(board, f1, opponent) &&
      !isSquareAttacked(board, f2, opponent)
    ) {
      moves.push({ from, to: f2, piece, captured: null, isCastle: "K" });
    }
  }

  const canCastleQueenside = turn === "w" ? castling.wQ : castling.bQ;
  if (canCastleQueenside) {
    const d1 = squareOf(3, rank);
    const d2 = squareOf(2, rank);
    const d3 = squareOf(1, rank);
    const rookSq = squareOf(0, rank);
    const rook = board[rookSq];
    if (
      !board[d1] &&
      !board[d2] &&
      !board[d3] &&
      rook &&
      rook.type === "r" &&
      rook.color === turn &&
      !isSquareAttacked(board, d1, opponent) &&
      !isSquareAttacked(board, d2, opponent)
    ) {
      moves.push({ from, to: d2, piece, captured: null, isCastle: "Q" });
    }
  }

  return moves;
}

export function pseudoLegalMovesFrom(state: GameState, from: Square): Move[] {
  const piece = state.board[from];
  if (!piece || piece.color !== state.turn) return [];

  switch (piece.type) {
    case "p":
      return pseudoLegalPawnMoves(state, from);
    case "n":
      return steppingMoves(state.board, from, KNIGHT_DELTAS, piece.color);
    case "b":
      return slidingMoves(state.board, from, BISHOP_DIRS, piece.color);
    case "r":
      return slidingMoves(state.board, from, ROOK_DIRS, piece.color);
    case "q":
      return slidingMoves(state.board, from, [...BISHOP_DIRS, ...ROOK_DIRS], piece.color);
    case "k":
      return [...steppingMoves(state.board, from, KING_DELTAS, piece.color), ...castlingMoves(state, from)];
    default:
      return [];
  }
}

/** Applies a move to a plain board (no game-state bookkeeping) for check-safety simulation. */
export function applyMoveToBoard(board: Board, move: Move): Board {
  const next = cloneBoard(board);
  next[move.from] = null;
  next[move.to] = move.promotion ? { type: move.promotion, color: move.piece.color } : move.piece;

  if (move.isEnPassant) {
    const capturedSq = squareOf(fileOf(move.to), rankOf(move.from));
    next[capturedSq] = null;
  }

  if (move.isCastle) {
    const rank = rankOf(move.from);
    if (move.isCastle === "K") {
      next[squareOf(5, rank)] = next[squareOf(7, rank)];
      next[squareOf(7, rank)] = null;
    } else {
      next[squareOf(3, rank)] = next[squareOf(0, rank)];
      next[squareOf(0, rank)] = null;
    }
  }

  return next;
}

function isLegal(state: GameState, move: Move, boundary: number): boolean {
  if (move.piece.type !== "p") {
    if (!isOnside(state.turn, rankOf(move.to), boundary)) return false;
  }
  const resultBoard = applyMoveToBoard(state.board, move);
  return !isInCheck(resultBoard, state.turn);
}

export function generateLegalMoves(state: GameState, from: Square): Move[] {
  const boundary = offsideBoundary(state.board, state.turn);
  return pseudoLegalMovesFrom(state, from).filter((move) => isLegal(state, move, boundary));
}

export function generateAllLegalMoves(state: GameState): Move[] {
  const boundary = offsideBoundary(state.board, state.turn);
  const moves: Move[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const piece = state.board[sq];
    if (piece && piece.color === state.turn) {
      for (const move of pseudoLegalMovesFrom(state, sq)) {
        if (isLegal(state, move, boundary)) moves.push(move);
      }
    }
  }
  return moves;
}

function updateCastlingRights(castling: CastlingRights, move: Move): CastlingRights {
  const next = { ...castling };
  if (move.piece.type === "k") {
    if (move.piece.color === "w") {
      next.wK = false;
      next.wQ = false;
    } else {
      next.bK = false;
      next.bQ = false;
    }
  }
  const touches = (sq: Square, file: number, rank: number) => sq === squareOf(file, rank);
  if (move.piece.type === "r" || move.captured?.type === "r") {
    if (touches(move.from, 0, 0) || touches(move.to, 0, 0)) next.wQ = false;
    if (touches(move.from, 7, 0) || touches(move.to, 7, 0)) next.wK = false;
    if (touches(move.from, 0, 7) || touches(move.to, 0, 7)) next.bQ = false;
    if (touches(move.from, 7, 7) || touches(move.to, 7, 7)) next.bK = false;
  }
  return next;
}

export function applyMove(state: GameState, move: Move): GameState {
  const board = applyMoveToBoard(state.board, move);
  const castling = updateCastlingRights(state.castling, move);

  let enPassant: Square | null = null;
  if (move.isDoublePawnPush) {
    const midRank = (rankOf(move.from) + rankOf(move.to)) / 2;
    enPassant = squareOf(fileOf(move.from), midRank);
  }

  const isCaptureOrPawn = move.piece.type === "p" || move.captured !== null;
  const halfmoveClock = isCaptureOrPawn ? 0 : state.halfmoveClock + 1;
  const fullmoveNumber = state.turn === "b" ? state.fullmoveNumber + 1 : state.fullmoveNumber;

  return {
    board,
    turn: otherColor(state.turn),
    castling,
    enPassant,
    halfmoveClock,
    fullmoveNumber,
  };
}

export function kingSquare(board: Board, color: Color): Square | null {
  return findKing(board, color);
}
