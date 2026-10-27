"""Eniu Studio: maneja Eniu desde la terminal.

    python tools/eniu-studio/studio.py --help

Ver tools/eniu-studio/README.md.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from eniu_studio.cli import main  # noqa: E402

if __name__ == "__main__":
    main()
