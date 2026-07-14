import type { Board, Color, PieceType } from "./types";
import { fromAlgebraic } from "./types";

function place(board: Board, alg: string, type: PieceType, color: Color): void {
  board[fromAlgebraic(alg)] = { type, color };
}

/**
 * "The Offside Trap": Black has thrown everything but the king forward past
 * rank 5, so White's offside line sits in the middle of the board — White
 * can freely occupy the empty ranks behind Black's advance, but can't send a
 * rook or queen up to pester the lone Black king until the line is pushed
 * back. Makes the rule's bite obvious the moment it loads.
 */
export function offsideTrapPosition(): Board {
  const board: Board = new Array(64).fill(null);

  place(board, "e1", "k", "w");
  place(board, "d2", "q", "w");
  place(board, "a1", "r", "w");
  place(board, "g1", "r", "w");
  place(board, "c4", "b", "w");
  place(board, "f3", "n", "w");
  place(board, "a2", "p", "w");
  place(board, "b2", "p", "w");
  place(board, "c2", "p", "w");
  place(board, "e4", "p", "w");
  place(board, "f2", "p", "w");
  place(board, "h2", "p", "w");

  place(board, "e8", "k", "b");
  place(board, "d5", "q", "b");
  place(board, "c5", "n", "b");
  place(board, "b4", "b", "b");
  place(board, "a5", "p", "b");
  place(board, "h5", "p", "b");

  return board;
}
