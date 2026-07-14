import type { Board, Color, GameState, Piece, PieceType } from "./types";
import { fromAlgebraic } from "./types";

export function emptyBoard(): Board {
  return new Array(64).fill(null);
}

export function place(board: Board, alg: string, type: PieceType, color: Color): Board {
  board[fromAlgebraic(alg)] = { type, color } as Piece;
  return board;
}

export function makeState(overrides: Partial<GameState> & { board: Board }): GameState {
  return {
    turn: "w",
    castling: { wK: false, wQ: false, bK: false, bQ: false },
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
    ...overrides,
  };
}
