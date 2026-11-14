# abdelrahamanaly.github.io

The personal website of **Abdelrahaman (Abdel) Aly**: applied cryptography, secure multi-party computation (MPC), fully homomorphic encryption (FHE) and privacy-preserving AI.

**Live:** https://abdelrahamanaly.github.io · **Side project:** [a walk through the heart of Brussels](https://abdelrahamanaly.github.io/brussels/)

## What's in this repository

| Path | What it is |
|---|---|
| `_data/profile.yml` | Name, tagline, links, the numbers strip, the program-committee ticker, about and contact text |
| `_data/highlights.yml` | The "Things I'm proud of" cards |
| `_data/experience.yml` | The career timeline |
| `_data/skills.yml` | The toolbox chips |
| `_data/publications.yml` | Selected publications, each with a DOI link |
| `_data/about.yml` | Education, community service, languages and side projects |
| `index.html` | The homepage template (Liquid). It only arranges the data above |
| `_layouts/default.html` | Page shell: `<head>`, fonts, stylesheet and script |
| `_includes/cipher.txt` | The hex texture behind the hero |
| `assets/site.css`, `assets/site.js` | Styles and the interactive bits |
| `brussels/` | The Brussels walking tour, a standalone page |
| `_config.yml` | Jekyll settings |
| `.github/workflows/check.yml` | Builds every pull request to catch mistakes before they go live |

The site is built with [Jekyll](https://jekyllrb.com/), the engine GitHub Pages runs natively. There is no build step to maintain: GitHub rebuilds the site after every merge to `main`.

## Editing

Almost every change is a YAML edit in `_data/`; the templates rarely need touching.

1. Open the YAML file on GitHub and click the pencil icon.
2. Make the change, choose **Create a new branch** and open a pull request.
3. The **Check site build** job runs. A green check means the site builds.
4. Merge. The live site updates within about a minute.

`main` is protected, so every change goes through a pull request.

Examples:

```yaml
# _data/publications.yml: add a paper at the top
- year: 2026
  title: A New Paper
  authors: Aly A., Coauthor B.
  venue: Conference
  url: https://doi.org/10.xxxx/xxxxx
```

```yaml
# _data/about.yml: add a talk or a committee
community:
  - Program committee, Some Conference 2026.
```

YAML tips: indent with spaces, never tabs. Wrap text in quotes when it contains a colon (`:`) or starts with a special character.

## Previewing locally

```bash
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000. This needs Ruby and Bundler. The Gemfile pins the same versions GitHub Pages uses.

## Easter eggs

- The orange bar in the tagline hides a few words until you hover over it or tap it.
- **encrypt this page**, or the `E` key, scrambles every word into hex and back.
- Section 05 has a secret-sharing toy: it splits a number into three shares that each look random.

## Licence

The code (templates, CSS, JavaScript) may be reused under the MIT licence. The text, the Brussels tour and other content are © Abdelrahaman Aly.
