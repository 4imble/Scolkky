# Mölkky Scorekeeper

A mobile-first React and TypeScript scorekeeper for Mölkky. Game progress and all-time wins are saved automatically in the browser.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production bundle, run `npm run build`.

## Rules implemented

- Exactly 50 points wins; exceeding 50 resets the score to 25.
- A single fallen skittle scores its printed value; multiple skittles score their count.
- Three consecutive misses eliminate a player.
- The final active player wins if all opponents are eliminated.
- Wins persist between games, and the complete state survives browser refreshes.
