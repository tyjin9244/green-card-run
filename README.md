# GREEN CARD RUN

Pixel-art parody runner: grab the green card and dash from downtown, through the golf club, to a Silicon Valley job before Trump catches you.

**Play:** https://green-card-run.vercel.app

## Character Agent
After the title screen you build your hero: pick one of 12 presets, describe one in plain text for the AI agent, or roll a random one, then tweak every part (head, eyes, facial hair, outfit, extra, colors, name, shout) live.

- **Input:** `POST /api/character` `{ "prompt": "coffee-addicted dev, red cap, sunglasses" }`
- **Output:** `{ "character": { name, title, catchphrase, bio, hat, eyewear, face, outfit, extra, palette }, "source": "ai" }`
- The agent (`api/character.ts`) is an AI SDK `ToolLoopAgent` with a Zod output schema, calling `anthropic/claude-sonnet-5.5` through the Vercel AI Gateway.
- The game validates the spec (`src/character/spec.ts`) and repaints the hero sprite from it (`applyCharacter` in `src/gfx/sprites.ts`).
- If the API is unreachable, an offline keyword generator (`src/character/offline.ts`) produces the character instead.
- Local dev: `npm run dev` serves the API too; it needs `AI_GATEWAY_API_KEY` or a `VERCEL_OIDC_TOKEN` (`vercel env pull`) in `.env.local`.

## Controls
- **Jump:** Space / ↑ / tap right side (press again in the air to double jump)
- **Slide:** ↓ / hold left side
- **Pause:** P · **Mute:** M

## Development
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # output in dist/
```

Built with Phaser 3 + Vite + TypeScript. All art and music are generated in code.
Pushing to `main` deploys automatically to Vercel.
