# Publish the portfolio

## First push to GitHub

Create an empty repository in your own GitHub account. A suitable name is `ibtsam-khalid-portfolio`; choose its visibility according to your needs. Leave GitHub's automatic README, license, and `.gitignore` options unchecked because the local files are already prepared.

From the project root, run the checks and review the files before committing:

```sh
python scripts/site.py check
python -m unittest discover -s tests -v
git status --short
git add .
git diff --cached --stat
git commit -m "Prepare portfolio repository and documentation"
```

Then copy the HTTPS repository URL from GitHub. Replace `YOUR-USERNAME` in this example with your account name (and change the repository name if needed):

```sh
git remote add origin https://github.com/YOUR-USERNAME/ibtsam-khalid-portfolio.git
git push -u origin main
```

These commands assume the local repository is initialized on `main` and has no `origin` remote. If starting from a downloaded ZIP, run `git init -b main` first. If you cloned an existing repository, its remote is already configured; use that remote instead.

Suggested GitHub **About** description:

> Responsive portfolio for Ibtsam Khalid — digital marketing, paid social, e-commerce, and lead generation. Built with HTML, CSS, and vanilla JavaScript.

Suggested topics: `portfolio`, `personal-website`, `digital-marketing`, `html`, `css`, `javascript`, `responsive-design`, `github-pages`.

## GitHub Pages

1. Push the repository and confirm the **CI** workflow passes.
2. Open **Settings → Pages → Build and deployment** and select **GitHub Actions** as the source.
3. Open **Actions → Deploy GitHub Pages → Run workflow** and choose the default branch.
4. Wait for the `deploy` job to finish. Its environment link shows the published URL.
5. Open that URL and run the key checks in [TESTING.md](TESTING.md).
6. Add the verified URL to the repository's **About → Website** field and the main README.

The workflow runs manually, checks the site again, and publishes only `dist/`. To publish a later change, push it and run the workflow again. Deployment from other branches is skipped. GitHub Pages must be available for your account and repository visibility.

The workflow uses the `github-pages` environment and GitHub's built-in token. There are no custom API keys or deployment secrets to add. See GitHub's [custom Pages workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages) for the platform requirements.

## Any static host

```sh
python scripts/site.py build
python -m http.server 4173 --bind 127.0.0.1 --directory dist
```

After checking the local output, upload the **contents of `dist/`** to your static host's public directory. Preserve filenames and folders. The packaging tool copies exactly the files listed in `site-files.json`; README images, extra source imagery, local backups, scripts, and documentation are excluded. It adds `.nojekyll` to the output for static hosting.

The build command recreates `dist/`, so keep source files elsewhere. No routing rewrites or server-side runtime are needed.

## Custom domains and sharing metadata

Configure a custom domain through the hosting provider's settings. For GitHub Pages, follow the official [custom-domain guide](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site). The repository does not assume a domain or include a placeholder `CNAME` file.

After confirming the final public URL, add a matching canonical URL and `og:url` to the head of `index.html`. If you add an `og:image`, use an absolute public image URL and include a local image in `site-files.json` when hosting it with the site.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| Pages configuration fails | Enable Pages with GitHub Actions as its source and confirm Pages is available for the repository. |
| Deployment is skipped | Run the workflow from the repository's default branch. |
| An image works locally but returns 404 online | Run the checks; check filename capitalization, URL-encoded spaces, and `site-files.json`. |
| A recent change is missing | Push the change, rerun deployment, and refresh without the browser cache. |
| Email draft does not open | Configure an email application, use WhatsApp, or copy the displayed email address. |
