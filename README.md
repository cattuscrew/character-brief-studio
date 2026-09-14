# Character Brief Studio

Character Brief Studio is a browser-based, field-first prompt builder for game character and creature artwork. It helps a non-artist choose clear options for each part of an `$imagegen` request and produces a readable brief and copy-ready prompt.

The app is deterministic and client-side. It does not call an AI model or an image-generation API.

## What is stored

- Recipes and reference images are stored locally in the browser using IndexedDB.
- They are not shared automatically between computers or browsers.
- Use the app's Export and Import actions to move a recipe and its reference images between devices.
- Nothing is uploaded by the app unless you explicitly export a ZIP or publish the site.

## Requirements

- Node.js `22.13.0` or newer
- npm (included with Node.js)
- Git, if you are downloading or synchronizing the source from GitHub

Check your versions:

```bash
node --version
npm --version
```

If Node.js is older than `22.13.0`, install a current Node.js 22 release from [nodejs.org](https://nodejs.org/) or switch to Node 22 with your preferred Node version manager.

## Run the app locally

### 1. Get the source code

For a new checkout, clone the GitHub repository:

```bash
git clone https://github.com/cattuscrew/character-brief-studio.git
cd character-brief-studio
```

If you already have this folder, just change into it:

```bash
cd /Users/andrewle/Documents/Workspace/dungeon-train-visdev
```

### 2. Install dependencies

Run the locked install used by this project:

```bash
npm run install:ci
```

If the install reports an unsupported Node.js version, upgrade Node.js and run the command again.

### 3. Start the development server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser. The page updates as you edit the source. Keep the terminal running while you work.

Stop the server with `Ctrl+C`.

### Share a temporary local URL (optional)

If your friend is on the same Wi-Fi network, you can let them view your running development server:

```bash
npm run dev -- --hostname 0.0.0.0
```

Find your computer's local IP address in its network settings, then have your friend open `http://YOUR_LOCAL_IP:5173`. This works only while the server is running and both computers are on the same network. It is not a public internet URL, and it does not share browser-stored recipes or images.

### 4. Preview a production build (optional)

Build the static site:

```bash
npm run build
```

The deployable static files are written to `dist/client`. To run the built app locally:

```bash
npm run start
```

Use the local URL printed by the command. Stop it with `Ctrl+C`.

## Where to edit

- `app/page.tsx` — the main editor layout and interactions
- `app/globals.css` — global visual styling and responsive layout
- `lib/brief-studio.ts` — field definitions, choices, conflict rules, and deterministic brief/prompt composition
- `lib/recipe-storage.ts` — browser storage, recipe library, and ZIP import/export
- `public/` — static assets such as the favicon

Keep generated folders such as `node_modules`, `dist`, `.next`, `.vinext`, and `.wrangler` out of commits unless a deployment workflow explicitly requires them.

## Recommended Git workflow

Create a branch for each change:

```bash
git switch -c your-name/short-description
```

After editing and testing:

```bash
git add .
git commit -m "Describe the change"
git push -u github your-name/short-description
```

Open a pull request on GitHub so the change can be reviewed before it is merged into `main`.

Before starting new work, update your local branch:

```bash
git switch main
git pull --rebase github main
```

This checkout calls the GitHub remote `github`. A fresh clone normally calls its remote `origin`; use that name instead when working from a fresh clone.

## Hosted URL

The local address [http://localhost:5173](http://localhost:5173) works only on the computer running the development server. GitHub stores the source code; it does not automatically make the app available at a public URL.

The current Sites deployment is available at:

[Character Brief Studio](https://character-brief-studio.outpost-rills6xbiryi.chatgpt.site)

For a URL that automatically rebuilds when `main` changes, connect the GitHub repository to a static host such as Cloudflare Pages. Use these build settings:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist/client`
- Node.js version: `22.13.0` or newer

## Useful commands

```bash
npm run dev       # start the local development server
npm run build     # create the deployable static build
npm run start     # preview the built app locally
npm run lint      # check source files for lint errors
```
