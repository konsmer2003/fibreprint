# NOTES.md — day-to-day workflow for FIBREPRINT

Quick reference for running, editing, and deploying the site.
For *what the project is and its constraints*, see CLAUDE.md — this file is just the mechanics.

Repo: ~/projects/files/fibreprint → github.com/konsmer2003/fibreprint (deploys via GitHub Pages)

---

## Two-terminal habit
Run the local server in ONE terminal and git in ANOTHER. If you run git in the
same window the server is using, the commands get swallowed and "nothing happens".
New terminal window on Mac: Cmd+N. New tab: Cmd+T.

If a terminal ever misbehaves, run `pwd` first — make sure you're in the repo
(`.../fibreprint`) and not your home folder (`~`). Most of the confusion comes
from being in the wrong directory.

---

## Start working (open Claude Code)
```
cd ~/projects/files/fibreprint
claude
```

## Run the site locally
In its own terminal:
```
cd ~/projects/files/fibreprint
python3 -m http.server 8000
```
Then open http://localhost:8000 in the browser.
- Must be http:// via the server, NOT opening index.html directly (fetch() needs http).
- The terminal will "hang" with no prompt — that's correct, it's running.
- Press Ctrl+C to stop it when done.

## See what you've changed (before committing)
```
cd ~/projects/files/fibreprint
git status            # which files changed
git diff              # the actual line-by-line changes (press q to exit)
```

## Push a change to GitHub
After editing and SAVING the files, in the git terminal:
```
git add -A
git commit -m "Describe what you actually changed"
git push
```
Notes:
- `git add -A` stages everything — glance at `git status` first so you know what's going in.
- Write a real message each time ("Fix nylon garment list", not a leftover from last time).
- Watch the `git push` output. If it asks for a username/password, GitHub no longer
  accepts account passwords over HTTPS — you need a personal access token. If it
  mentions "no upstream branch", run the exact command it suggests.

## Undo uncommitted changes to one file
Reverts the file to the last commit (you lose unsaved edits to it):
```
git restore data/materials.json
```

---

## After you push: seeing it live
Pushing updates the REPO instantly. The live SITE (GitHub Pages) is separate and
lags behind:
1. Wait 1–3 minutes (occasionally up to ~10) for Pages to rebuild.
2. Hard-refresh the live page: Cmd+Shift+R. Or open it in a private window.
   (A normal refresh often shows the old cached version — this is the usual cause
   of "it didn't update".)
3. Check the deploy ran: repo → Actions tab. Green check = live, yellow = still
   building, red X = failed (look at the log).

If the live page NEVER updates: confirm Pages is actually enabled in
Settings → Pages (source = main / root). If it's off, pushing will never produce
a visible site.

---

## Adding / changing a material (no code change needed)
Edit data/materials.json + data/sources.json. app.js derives everything from the
data. Every figure needs a `confidence` rating and at least one real `sources` entry —
if it can't be sourced, mark it `low` and explain in `note`, or leave it out.

## Per-material garment exclusions
Each conventional material can carry an `excludeGarments` array (denylist of product
ids) in materials.json — those garments won't show when that material is selected.
Default with no array = show all garments for the family. Use the real product ids
from products.json (e.g. `tshirt`, no hyphen).
