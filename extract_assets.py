"""Render PDF pages and extract embedded images into a new or empty directory."""

import argparse
import math
from pathlib import Path
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pdf", type=Path, help="Source PDF (not included in this repository)")
    parser.add_argument("--output", type=Path, default=Path("assets"), help="New or empty output directory (default: assets)")
    parser.add_argument("--zoom", type=float, default=2.0, help="Page rendering scale (default: 2)")
    args = parser.parse_args()
    if not args.pdf.is_file():
        parser.error(f"PDF not found: {args.pdf}")
    if not math.isfinite(args.zoom) or args.zoom <= 0:
        parser.error("--zoom must be a finite positive number")
    if args.output.exists() and (not args.output.is_dir() or any(args.output.iterdir())):
        parser.error("--output must be a new or empty directory")
    try:
        import pymupdf
    except ImportError:
        parser.error("Install the optional dependency first: python -m pip install PyMuPDF")

    try:
        with pymupdf.open(args.pdf) as document:
            if not document.is_pdf or document.needs_pass:
                parser.error("The source must be an unencrypted PDF")
            args.output.mkdir(parents=True, exist_ok=True)
            image_count = 0
            for page_number, page in enumerate(document, start=1):
                page.get_pixmap(matrix=pymupdf.Matrix(args.zoom, args.zoom)).save(args.output / f"page_{page_number}.png")
                for image_number, image in enumerate(page.get_images(full=True), start=1):
                    extracted = document.extract_image(image[0])
                    if not extracted:
                        continue
                    filename = f"extracted_p{page_number}_img{image_number}.{extracted['ext']}"
                    (args.output / filename).write_bytes(extracted["image"])
                    image_count += 1
            print(f"Rendered {len(document)} pages and extracted {image_count} images into {args.output.resolve()}")
        return 0
    except (OSError, ValueError, RuntimeError) as error:
        print(f"Extraction failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
