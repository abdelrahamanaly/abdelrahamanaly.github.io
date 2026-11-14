# abdel⊕aly: personal site

One static page, generated from `../src/content.js` by `node build_site.js` (or `node make.js`).
Do not edit `index.html` by hand; edit the content and rebuild.

`brussels/index.html` is your Brussels walking tour, copied in by hand. It is not generated, so edit it directly. The homepage links to it from "Side projects" (`site.sideProjects` in `content.js`).

The page deliberately leaves out phone numbers. It shows only your email, Google Scholar and GitHub.

## Publish on GitHub Pages

1. On GitHub, create a public repository named `abdelrahamanaly.github.io`. It must match your username exactly.
2. Push this folder to it:

```bash
cd ~/Documents/CV/website
git init -b main
git add index.html .nojekyll README.md brussels/
git commit -m "Personal site"
git remote add origin git@github.com:abdelrahamanaly/abdelrahamanaly.github.io.git
git push -u origin main
```

3. In the repository, go to Settings → Pages. Under Source, choose "Deploy from a branch", then `main` and `/ (root)`.
4. After a minute the site is live at https://abdelrahamanaly.github.io.

To update the site, run `node make.js` in `../src`, then commit and push `index.html` again.

## Easter eggs
- The orange bar in the tagline reveals the hidden words on hover or tap.
- The "encrypt this page" button, or the `E` key, scrambles every word into hex and back.
- The secret-sharing toy in section 05 splits a number into three additive shares mod 1000.
