# Character Brief Studio

A simple browser tool for building clear `$imagegen` prompts for game characters and creatures.

The app runs in your browser. It does not use AI or upload your recipes and reference images.

## Run it on your computer

### First time only

1. Install [Node.js 22](https://nodejs.org/).

2. Download the project:

```bash
git clone https://github.com/cattuscrew/character-brief-studio.git
cd character-brief-studio
```

3. Install the project files:

```bash
npm run install:ci
```

### Every time you want to use it

Open Terminal in the project folder and run:

```bash
npm run dev
```

Open this address in your browser:

[http://localhost:5173](http://localhost:5173)

Keep the terminal open while you use the app. Press `Ctrl+C` in the terminal to stop it.

## Make a change

Open the project folder in a code editor such as VS Code.

Common files:

- `app/page.tsx` — what the app does and what appears on screen
- `app/globals.css` — colors, spacing, and layout
- `lib/brief-studio.ts` — choices and prompt wording
- `lib/recipe-storage.ts` — saving, loading, and ZIP files

Save your file, then refresh the browser if it does not update automatically.

## Keep your copy up to date

Before you start editing:

```bash
git pull --rebase github main
```

After you finish editing:

```bash
git add .
git commit -m "Describe what you changed"
git push github main
```

Your friend can then update their copy with the same `git pull` command.

If Git says the remote is called `origin`, use `origin` instead of `github`.

## Important to know

- `localhost` works only on the computer running the app. Your friend should run their own local copy.
- Recipes and reference images are saved in each browser separately. They are not shared automatically. Use Export and Import in the app to move them.
- The current hosted version is available at [Character Brief Studio](https://character-brief-studio.outpost-rills6xbiryi.chatgpt.site).

## If something goes wrong

Check your Node.js version:

```bash
node --version
```

It must be `22.13.0` or newer. If you still need help, copy the error message from Terminal and share it with your teammate.
