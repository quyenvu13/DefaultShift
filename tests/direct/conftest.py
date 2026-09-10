import os, pathlib
ROOT = pathlib.Path(__file__).resolve().parents[2]
CONTRACT = str(ROOT / "contracts" / "DefaultPolarityGuard.py")
GENVM_VERSION = os.environ.get("GENVM_VERSION", "v0.2.12")
