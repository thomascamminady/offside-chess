import { describe, it, expect } from "vitest";
import { Game } from "../src/chess/game";
import { generateAllLegalMoves } from "../src/chess/moves";
import { fromAlgebraic } from "../src/chess/types";

describe("starting position", () => {
  it("has 20 legal moves for white (unrestricted: defenders are all at home)", () => {
    const game = new Game();
    expect(game.getAllLegalMoves()).toHaveLength(20);
  });

  it("lets white play e4 and black reply e5", () => {
    const game = new Game();
    const e2 = fromAlgebraic("e2");
    const e4 = fromAlgebraic("e4");
    const entry = game.makeMove(e2, e4);
    expect(entry).not.toBeNull();
    expect(entry?.san).toBe("e4");
    expect(game.state.turn).toBe("b");

    const e7 = fromAlgebraic("e7");
    const e5 = fromAlgebraic("e5");
    const entry2 = game.makeMove(e7, e5);
    expect(entry2?.san).toBe("e5");
  });
});

describe("basic rules", () => {
  it("supports castling kingside once squares are clear", () => {
    const game = new Game();
    // Clear the path for white kingside castling: Nf3, g3, Bg2.
    game.makeMove(fromAlgebraic("g1"), fromAlgebraic("f3"));
    game.makeMove(fromAlgebraic("g8"), fromAlgebraic("f6"));
    game.makeMove(fromAlgebraic("g2"), fromAlgebraic("g3"));
    game.makeMove(fromAlgebraic("g7"), fromAlgebraic("g6"));
    game.makeMove(fromAlgebraic("f1"), fromAlgebraic("g2"));
    game.makeMove(fromAlgebraic("f8"), fromAlgebraic("g7"));

    const legalKingMoves = game.getLegalMoves(fromAlgebraic("e1"));
    const castle = legalKingMoves.find((m) => m.isCastle === "K");
    expect(castle).toBeDefined();

    const entry = game.makeMove(fromAlgebraic("e1"), fromAlgebraic("g1"));
    expect(entry?.san).toBe("O-O");
  });

  it("promotes a pawn that reaches the back rank, even deep in enemy territory", () => {
    const board = new Array(64).fill(null);
    board[fromAlgebraic("a7")] = { type: "p", color: "w" };
    board[fromAlgebraic("e1")] = { type: "k", color: "w" };
    board[fromAlgebraic("e8")] = { type: "k", color: "b" };
    // Give black several pieces at home so white would otherwise be "offside" up there.
    board[fromAlgebraic("d8")] = { type: "q", color: "b" };
    board[fromAlgebraic("h8")] = { type: "r", color: "b" };

    const state = {
      board,
      turn: "w" as const,
      castling: { wK: false, wQ: false, bK: false, bQ: false },
      enPassant: null,
      halfmoveClock: 0,
      fullmoveNumber: 1,
    };

    const moves = generateAllLegalMoves(state);
    const promotions = moves.filter((m) => m.from === fromAlgebraic("a7") && m.promotion === "q");
    expect(promotions).toHaveLength(1);
  });
});

describe("checkmate detection", () => {
  it("detects a simple back-rank rook mate", () => {
    const board = new Array(64).fill(null);
    board[fromAlgebraic("e6")] = { type: "k", color: "w" };
    board[fromAlgebraic("h1")] = { type: "r", color: "w" };
    board[fromAlgebraic("e8")] = { type: "k", color: "b" };

    const state = {
      board,
      turn: "w" as const,
      castling: { wK: false, wQ: false, bK: false, bQ: false },
      enPassant: null,
      halfmoveClock: 0,
      fullmoveNumber: 1,
    };

    const game = new Game();
    game.state = state;

    const entry = game.makeMove(fromAlgebraic("h1"), fromAlgebraic("h8"));
    expect(entry).not.toBeNull();
    expect(game.status).toBe("checkmate");
  });
});
