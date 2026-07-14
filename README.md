# Offside Chess

Chess, plus one law imported from soccer — inspired by [xkcd #3268, "Offside"](https://xkcd.com/3268/).

Play it at **https://\<your-username\>.github.io/offside-chess/** once deployed (see below), or run it locally.

## The rule

A piece other than a pawn may never move to a square that's further into enemy
territory than the opponent's **second-deepest** piece. The opponent's single
deepest piece plays "goalkeeper" and is ignored; the *next* one back sets the
offside line. You're always free to manoeuvre inside your own half, no matter
how the opponent is arranged. Pawns are exempt entirely, including when they
promote. If the opponent has nothing left but their king, there's no second
defender, so the line disappears and the pitch is open.

The board draws this line live as a dashed rule with a corner flag, exactly
like the comic — try to push a piece past it and you'll get flagged.

Everything else is standard chess: castling, en passant, promotion (always to
a queen), check, checkmate, stalemate, and draws by insufficient material,
the fifty-move rule, or threefold repetition.

## Playing

- Click a piece, then click a highlighted square to move it.
- Choose to play White or Black against the built-in engine, or pick "Two
  player" for local pass-and-play.
- Three engine strengths are available (search depth 1–3 with basic
  alpha-beta pruning and piece-square evaluation — it plays honest, not
  perfect, chess).

## Development

Requires Node 20+.

```sh
npm install
npm run dev      # local dev server
npm test         # vitest — move generation, offside rule, checkmate detection
npm run build    # typecheck + production build to dist/
```

The core rules engine lives in `src/chess/` and has no DOM dependency — the
offside logic itself is in `src/chess/offside.ts`.

## Deploying to GitHub Pages

1. Push this repo to GitHub as `offside-chess` (or update the `base` path in
   `vite.config.ts` to match whatever you name it).
2. In the repo's **Settings → Pages**, set the source to **GitHub Actions**.
3. Push to `main` — `.github/workflows/deploy.yml` builds and deploys
   automatically.
