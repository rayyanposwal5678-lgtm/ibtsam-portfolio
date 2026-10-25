# Testing

## Automated checks

Run these commands from the repository root with Python 3.12+ and Node.js 24:

```sh
python scripts/site.py check
python -m unittest discover -s tests -v
python scripts/site.py build
```

CI runs the same commands on Linux and Windows. The checker validates the deployment manifest, local HTML/CSS references, gallery image filenames, DOM ID references, duplicate IDs, accessibility-reference targets, image `alt` attributes, local documentation file links, Python syntax, and JavaScript syntax. External URLs are not requested.

The tests exercise the repository tooling with temporary fixtures, including missing files, case mismatches, broken anchors, invalid deployment paths, and excluded private files. They also check the optional extractor's help, invalid inputs, and protection of existing output. They do not execute the website in a browser or perform PDF extraction, which requires the optional PyMuPDF package.

## Browser checklist

Serve the site locally and repeat relevant checks after changes. Use at least a narrow mobile viewport and a desktop viewport; useful widths are 320, 390, 768, 1024, and 1440 pixels.

- [ ] There is no horizontal overflow; text, navigation, and controls remain readable.
- [ ] Mobile navigation opens, closes, updates its accessible state, and closes after following a link.
- [ ] Section links reach the intended content; browser Back/Forward preserves useful navigation.
- [ ] The skip link and visible keyboard focus work.
- [ ] Both project galleries load every image and caption. Previous/next, arrow keys, Escape, and focus restoration work.
- [ ] Empty or whitespace-only required fields do not produce a draft.
- [ ] A completed form produces the expected email and WhatsApp drafts with punctuation and Unicode preserved.
- [ ] Editing the form hides the stale draft actions until a new draft is prepared.
- [ ] A service shortcut preselects the corresponding service.
- [ ] Copy email reports success or displays a usable fallback.
- [ ] The footer motion preference persists after reload. A system reduced-motion preference remains respected.
- [ ] With JavaScript disabled, the portfolio copy and direct contact links remain usable.
- [ ] With Google Fonts blocked, fallback fonts leave the page readable.
- [ ] The browser console has no unexpected errors and the Network panel has no missing local assets.

Use dummy inquiry text. Opening a draft is enough to inspect its content; do not send a message as part of a test.

## Deployment checks

Preview `dist/` after building. Also test it under a subdirectory when changing asset URLs, since GitHub project sites commonly use a repository path. Open the published URL after deployment and check the hero portrait, both galleries, navigation, and draft generation.

## Evidence and limits

The images in `docs/images/` are saved desktop and mobile previews from the existing design. Refresh them when the appearance changes. Do not treat screenshots, static checks, or tooling tests as proof of cross-browser behavior, WCAG conformance, frame-rate performance, or a Lighthouse score; record those only when actually measured.
