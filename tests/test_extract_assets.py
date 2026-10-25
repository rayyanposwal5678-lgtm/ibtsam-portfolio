"""Exercise the optional extractor's CLI without third-party dependencies."""

from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / "extract_assets.py"


class ExtractorCLITests(unittest.TestCase):
    def run_cli(self, *args):
        return subprocess.run([sys.executable, str(SCRIPT), *map(str, args)], capture_output=True, text=True)

    def test_help_works_without_installing_pymupdf(self):
        result = self.run_cli("--help")
        self.assertEqual(result.returncode, 0)
        self.assertIn("--output", result.stdout)

    def test_missing_pdf_does_not_create_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            result = self.run_cli(root / "missing.pdf", "--output", root / "output")
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("PDF not found", result.stderr)
            self.assertFalse((root / "output").exists())

    def test_existing_output_is_preserved(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            pdf = root / "source.pdf"
            pdf.write_bytes(b"PDF fixture: should not be opened")
            output = root / "output"
            output.mkdir()
            keep = output / "keep.txt"
            keep.write_text("Existing work")
            result = self.run_cli(pdf, "--output", output)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn("new or empty directory", result.stderr)
            self.assertEqual(keep.read_text(), "Existing work")

    def test_invalid_zoom_does_not_create_output(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            pdf = root / "source.pdf"
            pdf.write_bytes(b"PDF fixture: should not be opened")
            for zoom in ("0", "-1", "nan", "inf"):
                with self.subTest(zoom=zoom):
                    result = self.run_cli(pdf, "--zoom", zoom, "--output", root / "output")
                    self.assertNotEqual(result.returncode, 0)
                    self.assertIn("finite positive number", result.stderr)
                    self.assertFalse((root / "output").exists())


if __name__ == "__main__":
    unittest.main()
