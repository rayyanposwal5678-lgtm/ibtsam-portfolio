"""Regression tests for public asset validation and deployment packaging."""

import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location("portfolio_site", Path(__file__).resolve().parents[1] / "scripts" / "site.py")
site = importlib.util.module_from_spec(spec)
spec.loader.exec_module(site)


class SiteToolTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.files = ["index.html", "app.js", "My image/portrait.jpg"]
        self.write("index.html", '<main id="main"><a href="#main">Home</a><img src="My%20image/portrait.jpg?v=1" alt="Portrait"></main>')
        self.write("app.js", "document.getElementById('main');")
        self.write("My image/portrait.jpg", "image fixture")
        self.manifest(self.files)

    def write(self, name, content):
        path = self.root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")

    def manifest(self, files):
        self.write("site-files.json", json.dumps(files))

    def test_encoded_paths_and_query_strings(self):
        self.assertEqual(site.validate_site(self.root, site.load_manifest(self.root)), [])

    def test_missing_or_incorrectly_cased_files(self):
        for name in ("missing.jpg", "My image/Portrait.jpg"):
            with self.subTest(name=name):
                self.manifest(["index.html", name])
                with self.assertRaises(ValueError):
                    site.load_manifest(self.root)

    def test_manifest_rejects_private_and_escaping_paths(self):
        for name in ("../outside.js", "/outside.js", "C:/outside.js", ".env", ".backup/old.html", "dist/index.html", "README.md"):
            with self.subTest(name=name):
                self.manifest(["index.html", name])
                with self.assertRaisesRegex(ValueError, "Invalid public file"):
                    site.load_manifest(self.root)

    def test_duplicate_manifest_entries(self):
        self.manifest(self.files + ["app.js"])
        with self.assertRaisesRegex(ValueError, "duplicate"):
            site.load_manifest(self.root)

    def test_broken_anchor_dom_id_and_accessibility_reference(self):
        self.write("index.html", '<main id="main"><a href="#gone">Go</a><button aria-controls="missing">Open</button></main>')
        self.write("app.js", "document.getElementById('absent');")
        errors = "\n".join(site.validate_site(self.root, self.files))
        for expected in ("missing anchor #gone", "missing referenced id missing", "missing DOM id absent"):
            self.assertIn(expected, errors)

    def test_duplicate_ids_and_missing_alt(self):
        self.write("index.html", '<main id="main"><span id="main"></span><img src="My%20image/portrait.jpg"></main>')
        errors = "\n".join(site.validate_site(self.root, self.files))
        self.assertIn("duplicate id main", errors)
        self.assertIn("missing its alt", errors)

    def test_gallery_assets_must_be_published(self):
        self.write("app.js", "const gallery = [['campaign.jpg', 'Campaign', 'Caption']];")
        self.assertIn("Projects I worked on/campaign.jpg", "\n".join(site.validate_site(self.root, self.files)))

    def test_root_relative_urls_fail(self):
        self.write("index.html", '<main id="main"><script src="/app.js"></script></main>')
        self.assertIn("use a relative URL", "\n".join(site.validate_site(self.root, self.files)))

    def test_documentation_links_resolve_from_document(self):
        self.write("docs/guide.md", "[Home](../index.html)\n[External](https://example.com)\n[Missing](missing.md)")
        errors = site.validate_site(self.root, self.files)
        self.assertEqual(len(errors), 1)
        self.assertIn("missing.md", errors[0])

    def test_package_excludes_private_files_and_removes_stale_output(self):
        self.write(".env", "private fixture")
        self.write(".backup/old.html", "private fixture")
        self.write("dist/stale.txt", "old output")
        output = site.package_site(self.root, site.load_manifest(self.root))
        actual = {path.relative_to(output).as_posix() for path in output.rglob("*") if path.is_file()}
        self.assertEqual(actual, set(self.files) | {".nojekyll"})
        self.assertEqual((output / "index.html").read_bytes(), (self.root / "index.html").read_bytes())
        self.assertTrue((self.root / ".env").exists())

    def test_package_refuses_dist_file(self):
        self.write("dist", "Keep me")
        with self.assertRaisesRegex(ValueError, "not a directory"):
            site.package_site(self.root, self.files)
        self.assertEqual((self.root / "dist").read_text(), "Keep me")


if __name__ == "__main__":
    unittest.main()
