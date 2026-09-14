# Character Brief Studio

A simple browser tool for building clear `$imagegen` prompts for game characters and creatures.

The app runs in the browser. It does not use AI or upload your recipes and reference images.

## What you need

- A Windows or macOS computer
- Node.js 22 or newer
- A GitHub account
- GitHub Desktop (recommended)
- A code editor such as [VS Code](https://code.visualstudio.com/) (recommended)

Install Node.js from [nodejs.org](https://nodejs.org/). Install GitHub Desktop from [desktop.github.com](https://desktop.github.com/).

## First-time setup

### 1. Get access to the project

The project is private. The owner must invite you to the GitHub repository before you can download it:

[github.com/cattuscrew/character-brief-studio](https://github.com/cattuscrew/character-brief-studio)

### 2. Download the project

1. Open GitHub Desktop and sign in.
2. Choose **File → Clone repository**.
3. Select `cattuscrew/character-brief-studio`.
4. Choose where to save it, then click **Clone**.
5. Open the folder in VS Code.

### 3. Install the project (one time)

Open a terminal in the project folder. GitHub Desktop can open one from its **Repository** menu.

Copy and paste:

```bash
npm run install:ci
```

## Start the app

Whenever you want to use the app:

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

Keep the terminal open while using the app. Press `Ctrl+C` to stop it.

## Make a change

1. In GitHub Desktop, click **Fetch origin**, then **Pull origin**.
2. Open the project in VS Code.
3. Edit a file and save it.
4. Check the changes shown in GitHub Desktop.
5. Write a short summary, click **Commit to main**, then **Push origin**.

Your teammate can then click **Fetch origin** and **Pull origin** to receive the change. GitHub Desktop handles the Git commands for you.

Common files:

- `app/page.tsx` — app behavior and screen content
- `app/globals.css` — colors, spacing, and layout
- `lib/brief-studio.ts` — choices and prompt wording
- `lib/recipe-storage.ts` — saving, loading, and ZIP files

## Important to know

- `localhost` works only on the computer running the app. Your teammate should run their own copy.
- Recipes and reference images are saved in each browser separately. They are not shared automatically. Use Export and Import in the app to move them.
- If you only want to use the app, open the hosted version: [Character Brief Studio](https://character-brief-studio.outpost-rills6xbiryi.chatgpt.site).

## If something goes wrong

Check the Node.js version:

```bash
node --version
```

It must be `22.13.0` or newer. If it is still older, install Node.js again and reopen GitHub Desktop and your terminal.
