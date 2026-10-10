# iCloud Notes for Windows

A small Electron wrapper around China mainland iCloud Notes ([icloud.com.cn/notes](https://www.icloud.com.cn/notes))
that runs as its own Windows app, so it can be pinned to the taskbar. To use the international site
instead, change `NOTES_URL` in `main.js` to `https://www.icloud.com/notes`.

- Stays signed in between launches (session is saved to disk).
- Fills in your Apple ID and password automatically if the session ever expires.
- Remembers window size/position; clicking the taskbar icon again focuses the existing window.
- Non-Apple links open in your default browser.

## Setup

```sh
npm install
node node_modules/electron/install.js   # only if `npm start` says the Electron binary is missing
```

Create `config.json` (copy `config.example.json`):

```json
{
  "appleId": "you@example.com",
  "password": "your-apple-id-password"
}
```

`config.json` is git-ignored. It is stored in plain text and bundled into the built app, so keep the
machine and the build output private.

## Run / build

```sh
npm start      # run from source
npm run dist   # build dist/iCloud Notes Setup <version>.exe
```

Run the installer, then right-click **iCloud Notes** in the Start menu → **Pin to taskbar**.

You can also place a `config.json` next to the installed `iCloud Notes.exe`
(`%LOCALAPPDATA%\Programs\icloud-notes-desktop\`) to change credentials without rebuilding.

## Notes

- Two-factor authentication can't be automated: the first sign-in needs the 6-digit code from your
  Apple device. Choose **Trust** when asked, and later launches go straight to your notes.
- Menu bar is hidden; press <kbd>Alt</kbd> to show it (reload, zoom, dev tools, Notes home).
- If you run it from a VS Code terminal and it exits immediately, the `ELECTRON_RUN_AS_NODE`
  environment variable is set there; unset it or launch from a normal terminal.
