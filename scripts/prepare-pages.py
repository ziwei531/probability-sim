#!/usr/bin/env python3
"""Assemble the GitHub Pages artifact and fingerprint its text assets."""

from pathlib import Path
import shutil
import sys

TOKEN = "__BUILD_VERSION__"
TEXT_SUFFIXES = { ".html", ".js", ".css", ".xml", ".json", ".txt" }


def copy_tree( source: Path, target: Path ) -> None:
	if target.exists():
		shutil.rmtree( target )
	shutil.copytree( source, target )


def main() -> None:
	output = Path( sys.argv[1] if len( sys.argv ) > 1 else "_site" )
	version = sys.argv[2] if len( sys.argv ) > 2 else "dev"
	root = Path( __file__ ).resolve().parent.parent

	if output.exists():
		shutil.rmtree( output )
	output.mkdir( parents=True )

	shutil.copy2( root / "index.html", output / "index.html" )
	shutil.copy2( root / "gacha.html", output / "gacha.html" )

	for directory in ( "assets", "js", "styles", "views" ):
		copy_tree( root / directory, output / directory )

	for path in output.rglob( "*" ):
		if path.is_file() and path.suffix in TEXT_SUFFIXES:
			text = path.read_text()
			path.write_text( text.replace( TOKEN, version ) )

	print( f"Prepared { output } with build version { version }" )


if __name__ == "__main__":
	main()
