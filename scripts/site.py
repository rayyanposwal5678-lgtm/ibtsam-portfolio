"""Dependency-free validation and packaging for this static portfolio."""

import argparse
import ast
from collections import Counter
from html.parser import HTMLParser
import json
from pathlib import Path, PurePosixPath
import posixpath
import re
import shutil
import subprocess
import sys
from urllib.parse import unquote, urlsplit

ROOT = Path(__file__).resolve().parents[1]
PUBLIC_EXTENSIONS = {".html", ".css", ".js", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico", ".woff", ".woff2"}


def exact_file(root, name):
    """Check case even on Windows, and refuse links outside the checkout."""
    path = root
    for part in PurePosixPath(name).parts:
        if not path.is_dir() or part not in {item.name for item in path.iterdir()}:
            return False
        path = path / part
        if path.is_symlink() or path.is_junction():
            return False
    return path.is_file() and path.resolve().is_relative_to(root.resolve())


def load_manifest(root):
    files = json.loads((root / "site-files.json").read_text(encoding="utf-8"))
    if not isinstance(files, list) or not files or not all(isinstance(item, str) for item in files):
        raise ValueError("site-files.json must be a nonempty list of relative file paths")
    if len(files) != len(set(files)):
        raise ValueError("site-files.json contains duplicate paths")
    for name in files:
        path = PurePosixPath(name)
        if (not name or "\\" in name or ":" in name or path.is_absolute()
                or name != path.as_posix() or any(part.startswith(".") for part in path.parts)
                or path.parts[0] in {"dist", "node_modules"}
                or path.suffix.lower() not in PUBLIC_EXTENSIONS):
            raise ValueError(f"Invalid public file path: {name!r}")
        if not exact_file(root, name):
            raise ValueError(f"Missing, incorrectly cased, or linked public file: {name}")
    if "index.html" not in files:
        raise ValueError("site-files.json must include index.html")
    return files


class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = []
        self.references = []
        self.id_references = []
        self.errors = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if attrs.get("id"):
            self.ids.append(attrs["id"])
        for key in ("src", "href", "poster"):
            if attrs.get(key):
                self.references.append(attrs[key])
        for key in ("aria-controls", "aria-labelledby", "aria-describedby", "for"):
            self.id_references.extend((attrs.get(key) or "").split())
        if tag == "img" and "alt" not in attrs:
            self.errors.append("An image is missing its alt attribute")


def local_url(reference):
    url = urlsplit(reference)
    if url.scheme or url.netloc:
        return None
    return unquote(url.path), unquote(url.fragment)


def validate_site(root, files):
    errors = []
    published = set(files)
    pages = {}
    for name in files:
        if name.endswith(".html"):
            page = Page()
            page.feed((root / name).read_text(encoding="utf-8"))
            pages[name] = page

    def check_reference(source, reference):
        local = local_url(reference)
        if local is None:
            return
        path, fragment = local
        if path.startswith("/") or "\\" in path:
            errors.append(f"{source}: use a relative URL for {reference!r}")
            return
        target = posixpath.normpath(posixpath.join(posixpath.dirname(source), path)) if path else source
        if target not in published:
            errors.append(f"{source}: asset not in site-files.json: {target}")
        elif fragment and target in pages and fragment not in pages[target].ids:
            errors.append(f"{source}: missing anchor #{fragment} in {target}")

    for name, page in pages.items():
        errors.extend(f"{name}: {error}" for error in page.errors)
        errors.extend(f"{name}: duplicate id {key}" for key, count in Counter(page.ids).items() if count > 1)
        errors.extend(f"{name}: missing referenced id {key}" for key in page.id_references if key not in page.ids)
        for reference in page.references:
            check_reference(name, reference)

    ids = set(pages["index.html"].ids)
    for name in files:
        if name.endswith(".css"):
            for reference in re.findall(r"url\(\s*['\"]?([^)'\"]+)['\"]?\s*\)", (root / name).read_text(encoding="utf-8")):
                check_reference(name, reference.strip())
        if name.endswith(".js"):
            source = (root / name).read_text(encoding="utf-8")
            for element_id in re.findall(r"getElementById\(['\"]([^'\"]+)['\"]\)", source):
                if element_id not in ids:
                    errors.append(f"{name}: missing DOM id {element_id}")
            if name == "app.js":
                # Gallery entries begin with a filename, then alt text and a caption.
                for image in re.findall(r"\[\s*['\"]([^'\"]+\.(?:png|jpe?g|webp|svg))['\"]\s*,", source):
                    check_reference(name, f"Projects%20I%20worked%20on/{image}")

    documents = list(root.glob("*.md")) + list((root / "docs").rglob("*.md")) + list((root / ".github").rglob("*.md"))
    for document in documents:
        text = re.sub(r"```.*?```", "", document.read_text(encoding="utf-8"), flags=re.S)
        references = re.findall(r"\]\(([^\s)]+)\)", text)
        references += re.findall(r"(?:src|href)=[\"']([^\"']+)[\"']", text)
        for reference in references:
            local = local_url(reference)
            if local is None or not local[0]:
                continue
            relative = document.relative_to(root).as_posix()
            target = posixpath.normpath(posixpath.join(posixpath.dirname(relative), local[0]))
            if target.startswith(("../", "/")) or not exact_file(root, target):
                errors.append(f"{relative}: missing local documentation file {local[0]}")
    return errors


def check_syntax(root, files):
    errors = []
    node = shutil.which("node")
    if not node:
        errors.append("Node.js is required for JavaScript syntax checks; install Node.js 24")
    else:
        for name in files:
            if name.endswith(".js"):
                result = subprocess.run([node, "--check", str(root / name)], capture_output=True, text=True)
                if result.returncode:
                    errors.append(f"{name}: {result.stderr.strip()}")
    python_files = list((root / "scripts").glob("*.py")) + list((root / "tests").glob("*.py")) + list(root.glob("*.py"))
    for path in python_files:
        try:
            ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        except SyntaxError as error:
            errors.append(str(error))
    return errors


def package_site(root, files):
    """Replace only the verified checkout-local dist directory."""
    root = root.resolve()
    output = root / "dist"
    if output.is_symlink() or output.is_junction() or output.resolve() != root / "dist":
        raise ValueError("Refusing to replace a linked or external dist directory")
    if output.exists():
        if not output.is_dir():
            raise ValueError("dist exists but is not a directory")
        shutil.rmtree(output)
    output.mkdir()
    for name in files:
        destination = output / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(root / name, destination)
    (output / ".nojekyll").write_text("", encoding="utf-8")
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("check", "build"))
    args = parser.parse_args()
    try:
        files = load_manifest(ROOT)
        errors = validate_site(ROOT, files) + check_syntax(ROOT, files)
        if errors:
            for error in errors:
                print(f"ERROR: {error}", file=sys.stderr)
            return 1
        print(f"PASS: validated {len(files)} public files, page references, documentation links, and syntax")
        if args.command == "build":
            output = package_site(ROOT, files)
            size = sum(path.stat().st_size for path in output.rglob("*") if path.is_file())
            print(f"Built {output} ({len(files) + 1} files, {size / 1024 / 1024:.2f} MiB)")
        return 0
    except (OSError, ValueError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
