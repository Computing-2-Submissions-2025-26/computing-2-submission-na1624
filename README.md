
# Power-Up Ludo

Power-Up Ludo is a two-player board game based on classic Ludo. Red and Blue race to get all four of their pieces from spawn, around the shared outer ring, and into their home base. Special power-up squares scattered around the ring change the game with boosts, shields, freezes, sprints, swaps, and bombs.

Red always goes first. The first player to bring all four pieces home wins.

## How to Play

Each player starts with four pieces in their spawn area. A piece can only leave spawn on a roll of **1 or 6**.

On each turn, click **Roll Dice**. Valid pieces to move are highlighted — click one to move it. If no valid moves exist after rolling, the turn passes automatically.

Pieces travel clockwise around the shared outer ring before heading down their home stretch. Landing on the same square as an enemy piece sends that enemy back to spawn, unless they are shielded. Captures cannot happen on power-up squares.

### Power-Ups

| Power-Up | Effect |
|---|---|
| ⚡ Boost | Move forward 3 extra squares instantly |
| 🛡️ Shield | Protected from capture until the piece next moves |
| ❄️ Freeze | The piece cannot move for 2 turns |
| 💨 Sprint | Roll again — the same piece moves a second time |
| 🔄 Swap | Choose any enemy piece on the ring to swap positions with |
| 💣 Bomb | Plants mines on 3 nearby squares — any piece landing there returns to spawn |

Use **↩ Undo** to step back one move, or **↺ Restart** to reset the game at any time.

## Project Files

- `web-app/game.js` — pure game rules and state transitions
- `web-app/main.js` — browser UI, piece animations, and event handling
- `web-app/index.html` — page structure and layout
- `web-app/default.css` — board and interface styling
- `web-app/tests/` — unit tests for the game module

The browser code asks the game module what moves are valid and redraws the interface accordingly. All rules for movement, power-ups, captures, and win conditions are kept in `game.js` so the game can be tested independently from the browser.

## Game Module API

The public API is in `web-app/game.js`. It creates games, rolls dice, returns valid moves, applies piece moves and power-up effects, handles swap and sprint phases, and exposes read-only accessors for all game state.

## Game Module Implementation

The game module is written as pure state transitions. Illegal actions return the unchanged state, finished games do not advance, and the browser code does not decide the rules directly.

## Unit Tests

Tests cover the core behaviours of the game module: initial state, deploying pieces, movement, captures, each power-up effect, the freeze and shield mechanics, and the win condition.

## Web Application

The web app uses HTML for structure, CSS for presentation, and `main.js` for browser behaviour. It supports mouse input, dice animation, piece movement animation, power-up highlighting, an undo stack, and a winner overlay.

## Installation

Clone the repository, then run:

```bash
npm install
```

## Running

Open `web-app/index.html` directly in your browser, or use the VS Code **Run Web App** configuration if available.

Useful commands:

```bash
npm test
npm run docs
```