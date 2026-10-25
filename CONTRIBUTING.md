# Contributing

This is Ibtsam Khalid's personal portfolio. Focus contributions on clear content, reliable interactions, accessibility, and keeping the site easy to maintain.

## Local workflow

1. Create a branch with a descriptive name, such as `fix/mobile-gallery-focus`.
2. Serve the repository with `python -m http.server 4173 --bind 127.0.0.1`.
3. Make a focused change and update documentation when behavior changes.
4. Run the commands below from the repository root.
5. Complete the relevant [browser checks](docs/TESTING.md) and open a pull request using the template.

```sh
python scripts/site.py check
python -m unittest discover -s tests -v
python scripts/site.py build
```

Use Python 3.12+ and Node.js 24. No package installation is required for the checks.

## Conventions

- Keep the site build-free and use browser APIs unless an added dependency solves a concrete problem.
- Follow the surrounding code style. Avoid mixing a feature change with a whole-file reformat.
- Preserve visible focus, keyboard controls, useful image alternative text, and reduced-motion behavior.
- Keep links and asset paths relative so deployment also works under a repository subpath.
- Add new deployed files to `site-files.json`. Check filenames on a case-sensitive filesystem or run the validation tool.
- Update the gallery captions, dates, and README when campaign content changes. Do not invent performance claims.
- Keep the contact form's draft-only behavior clear. Never send a real inquiry during testing.
- Keep local backups, credentials, generated files, and raw source PDFs out of a pull request.

Personal photographs and client materials require the owner's direction before replacement or reuse. No open-source license has been selected for this repository.

## Reporting a problem

Include the page section, browser, viewport size, reproduction steps, expected behavior, and actual behavior. Attach a screenshot when it helps explain a visual issue, with private information removed.

For a possible security issue, use GitHub's private vulnerability reporting when enabled, or the owner's existing [email contact](mailto:ibtsam.official591@gmail.com). Avoid posting credentials or private client details in a public issue.
