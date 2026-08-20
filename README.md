# Collector

A web implementation of **Collector** — a creature-collecting game of coins,
timing, and rare titles — built to be played:

- **Solo vs Bots** — 1-5 AI opponents at four difficulty tiers, no setup needed
- **Pass & Play** — 2-6 players sharing one device
- **Online** — create a room, share a short code, play across devices (with
  bots optionally filling empty seats), powered by Firebase

> **House re-theme note:** the Ogre and Sphinx from the original rulebook are
> reskinned here as **Dryad** and **Harpy** (art + name only — all point
> values, costs, and deck counts are unchanged from the official Almanac).

---

## Project structure

```
src/
  data/            Creature & Title definitions (the "Almanac")
  engine/           Pure, deterministic game engine (setup, rules, scoring)
  bots/             Bot AI - four difficulty tiers
  firebase/         Firebase config + online room/lobby/turn logic
  hooks/            useLocalGame (solo/pass-play) and useOnlineGame (online)
  components/       Presentational UI (Vault, CoinDisplay, TitlesBoard, etc.)
  screens/          Home, setup, and lobby screens
  styles/           Design tokens + component styles
scripts/
  simulate.mjs      Headless bot-vs-bot simulator, used to sanity-check the
                    engine and balance the bot difficulty tiers
public/assets/      Creature and coin art
```

The engine (`src/engine`) is pure and has no UI dependencies — every rule
from the rulebook (coin collection, buying, clearing the Vault, claiming
titles, locking, end-game triggers, tiebreakers) lives there and is reused
identically across all three play modes and by the bots.

---

## Running locally

```bash
npm install
npm run dev
```

Open the printed `localhost` URL. **Solo** and **Pass & Play** work
immediately with no configuration. **Online** requires the Firebase setup
below.

To sanity-check the engine/bots without a browser:

```bash
npm run simulate
```

This plays 100 full bot-vs-bot games across 2-6 players and reports pass/fail
— useful after any engine or bot changes.

---

## Firebase setup (required for Online play)

Online play uses **Firestore** (to store room/game state) and **Anonymous
Authentication** (so each browser tab has a stable identity without asking
players to sign up). Both are on Firebase's free "Spark" plan for a game this
size.

### 1. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
   and click **Add project**. Name it anything (e.g. `collector-game`).
   You can disable Google Analytics — it's not needed.
2. Once created, click the **web icon (`</>`)** on the project overview page
   to register a new web app. Give it any nickname. You don't need Firebase
   Hosting for this step (we'll deploy via GitHub Pages instead, though
   Firebase Hosting is also included as an option below).
3. Firebase will show you a `firebaseConfig` object with keys like `apiKey`,
   `authDomain`, `projectId`, etc. Keep this tab open — you'll need these
   values shortly.

### 2. Enable Firestore

1. In the left sidebar, go to **Build → Firestore Database**.
2. Click **Create database**. Choose any region close to your players.
3. Start in **production mode** (we'll deploy proper rules from this repo in
   a moment, in step 5).

### 3. Enable Anonymous Authentication

1. In the left sidebar, go to **Build → Authentication → Get started**.
2. Under the **Sign-in method** tab, enable **Anonymous**.

### 4. Add your config locally

Copy `.env.example` to `.env.local` and fill in the values from step 1:

```bash
cp .env.example .env.local
```

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=collector-game.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=collector-game
VITE_FIREBASE_STORAGE_BUCKET=collector-game.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abcdef
```

Restart `npm run dev` after saving — Online mode will now work locally.

### 5. Deploy the Firestore security rules

This repo includes `firestore.rules`, which allows any signed-in (including
anonymous) user who knows a room code to read/write that room, while blocking
a few obviously invalid writes. Deploy it with the [Firebase
CLI](https://firebase.google.com/docs/cli):

```bash
npm install -g firebase-tools
firebase login
firebase use --add          # pick the project you just created
firebase deploy --only firestore:rules
```

---

## Deploying to GitHub Pages

This repo includes a ready-to-go GitHub Actions workflow
(`.github/workflows/deploy.yml`) that builds the app and publishes it to
GitHub Pages on every push to `main`.

1. **Push this repo to GitHub** (create a new repo and push, or use the
   GitHub CLI: `gh repo create collector --public --source=. --push`).
2. In your GitHub repo, go to **Settings → Pages** and set **Source** to
   **GitHub Actions**.
3. If you want Online play to work on the deployed site, add your Firebase
   config as **repository secrets** (**Settings → Secrets and variables →
   Actions → New repository secret**), one for each of:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

   (Skip this if you only want Solo/Pass & Play on the deployed site.)
4. Also add your deployed domain to Firebase's **Authentication → Settings →
   Authorized domains** list (e.g. `yourname.github.io`), or anonymous
   sign-in will be blocked there.
5. Push to `main` (or run the workflow manually from the **Actions** tab).
   Your game will be live at `https://<your-username>.github.io/<repo-name>/`.

### Alternative: Firebase Hosting instead of GitHub Pages

`firebase.json` in this repo is already configured for Hosting too, if you'd
rather keep everything in one place:

```bash
npm run build
firebase deploy --only hosting
```

---

## How the bots work

Bot difficulty lives in `src/bots/`. All four tiers play a full turn
(collect coins → market actions → claim titles → end turn) using the same
engine as a human player — there's no special-cased "bot mode" in the rules.

- **Easy** — mostly random legal moves.
- **Medium** — greedily buys whatever affordable creature is worth the most
  raw points.
- **Hard** — buys based on a blended value (raw points + progress toward
  currently available Titles), and clears the Vault when it's clearly worse
  than the remaining deck.
- **Expert** — everything Hard does, plus: it tracks when a rival is one
  creature away from a Title and prioritizes contesting it, and it will hold
  back claiming a small Title for a turn if the same creatures could instead
  complete a substantially bigger one.

This was tuned and validated with `npm run simulate` — across thousands of
simulated games, Expert beats Hard, Medium, and Easy at a clear, statistically
significant rate. That said, **all creatures are public knowledge in this
game — the only hidden information is which coins come up on a random
draw** — so no bot can be mathematically "unbeatable" against every possible
run of the coin pile. Expert is best understood as a genuinely strong,
hard-to-beat opponent rather than a guaranteed win every time.

---

## Notes on online play's architecture

There's no backend server — clients talk to Firestore directly:

- A room is a single Firestore document (`games/{CODE}`) holding the lobby
  seats and, once started, the full engine state.
- Every player action (take a coin, buy a creature, claim a title, etc.) is
  submitted as a Firestore **transaction** that re-validates it's still that
  player's turn before applying it — this avoids two devices' actions
  clashing.
- Bot turns in an online game are computed and submitted by whichever client
  is the **host** (the player who created the room), also inside a
  transaction, so multiple tabs can't double-apply the same bot turn.

This keeps hosting costs at zero and the codebase simple, at the cost of
trusting connected clients somewhat more than a dedicated server would. For a
casual game among friends, that's a reasonable trade.
