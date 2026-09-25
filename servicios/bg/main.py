"""Compara ISNet normal y con alpha matting en dos procesos CPU independientes."""

from time import perf_counter

PROCESS_START = perf_counter()

import argparse
import json
import os
import platform
import resource
import subprocess
import sys
from io import BytesIO
from pathlib import Path
from threading import Event, Thread

os.environ.setdefault("OMP_NUM_THREADS", "2")

import psutil
from PIL import Image, UnidentifiedImageError
from rembg import new_session, remove

MODEL = "isnet-general-use"
MODES = ("normal", "alpha-matting")
ALPHA_PARAMETERS = {
    "foreground_threshold": 240,
    "background_threshold": 10,
    "erode_size": 10,
}
MAX_BYTES = 15 * 1024 * 1024
PROCESS = psutil.Process(os.getpid())


def rss_bytes() -> int:
    return PROCESS.memory_info().rss


def process_peak_bytes() -> int:
    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return peak if sys.platform == "darwin" else peak * 1024


class PeakRSS:
    """Muestrea el RSS durante la ejecución completa, incluido alpha matting."""

    def __init__(self):
        self.peak = rss_bytes()
        self.stop = Event()
        self.thread = Thread(target=self.sample, daemon=True)

    def sample(self):
        while not self.stop.wait(0.005):
            self.peak = max(self.peak, rss_bytes())

    def __enter__(self):
        self.thread.start()
        return self

    def __exit__(self, *_):
        self.stop.set()
        self.thread.join()
        self.peak = max(self.peak, rss_bytes())


class TimedSession:
    """Mide predict(): preparación, ONNX y escalado de la máscara."""

    def __init__(self, session):
        self.session = session
        self.predict_start = 0.0
        self.predict_end = 0.0

    def predict(self, *args, **kwargs):
        self.predict_start = perf_counter()
        masks = self.session.predict(*args, **kwargs)
        self.predict_end = perf_counter()
        return masks


def read_image(path: Path) -> bytes:
    if not path.is_file() or path.stat().st_size > MAX_BYTES:
        raise ValueError(f"{path}: la imagen debe existir y pesar hasta 15 MB.")
    data = path.read_bytes()
    try:
        with Image.open(BytesIO(data)) as image:
            if image.format not in ("JPEG", "PNG"):
                raise ValueError(f"{path}: sólo se aceptan JPG o PNG.")
            image.verify()
    except (UnidentifiedImageError, OSError, Image.DecompressionBombError) as error:
        raise ValueError(f"{path}: JPG o PNG inválido.") from error
    return data


def output_path(output_dir: Path, image_index: int, image: Path, count: int, mode: str) -> Path:
    folder = output_dir if count == 1 else output_dir / f"{image_index + 1:02d}-{image.stem}"
    return folder / f"{mode}.png"


def benchmark_mode(images: list[Path], output_dir: Path, repetitions: int, mode: str) -> dict:
    before_load = rss_bytes()
    load_start = perf_counter()
    session = new_session(MODEL, providers=["CPUExecutionProvider"])
    load_ms = (perf_counter() - load_start) * 1000
    after_load = rss_bytes()
    model_bytes = Path(session.__class__.download_models()).stat().st_size

    runs = []
    for image_index, source in enumerate(images):
        output = output_path(output_dir, image_index, source, len(images), mode)
        output.parent.mkdir(parents=True, exist_ok=True)
        for repetition in range(1, repetitions + 1):
            run_start = perf_counter()
            with PeakRSS() as memory:
                data = read_image(source)
                timed = TimedSession(session)
                cutout = remove(
                    data,
                    session=timed,
                    alpha_matting=mode == "alpha-matting",
                    alpha_matting_foreground_threshold=ALPHA_PARAMETERS["foreground_threshold"],
                    alpha_matting_background_threshold=ALPHA_PARAMETERS["background_threshold"],
                    alpha_matting_erode_size=ALPHA_PARAMETERS["erode_size"],
                )
                with Image.open(BytesIO(cutout)) as result:
                    result.convert("RGBA").save(output, format="PNG")
                run_end = perf_counter()

            cold = image_index == 0 and repetition == 1
            runs.append(
                {
                    "image_index": image_index,
                    "repetition": repetition,
                    "phase": "cold" if cold else "warm",
                    "input": str(source),
                    "output": str(output),
                    "preprocessing_ms": round((timed.predict_start - run_start) * 1000, 1),
                    "inference_ms": round((timed.predict_end - timed.predict_start) * 1000, 1),
                    "postprocessing_ms": round((run_end - timed.predict_end) * 1000, 1),
                    "total_ms": round(
                        (run_end - PROCESS_START if cold else run_end - run_start) * 1000,
                        1,
                    ),
                    "peak_run_rss_bytes": memory.peak,
                    "rss_after_run_bytes": rss_bytes(),
                }
            )

    report = {
        "mode": mode,
        "model_bytes": model_bytes,
        "rss_before_load_bytes": before_load,
        "rss_after_load_bytes": after_load,
        "load_ms": round(load_ms, 1),
        "peak_process_rss_bytes": process_peak_bytes(),
        "runs": runs,
    }
    (output_dir / f"{mode}-results.json").write_text(json.dumps(report, indent=2))
    return report


def compare(images: list[Path], output_dir: Path, repetitions: int) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    mode_reports = []
    for mode in MODES:
        command = [
            sys.executable,
            str(Path(__file__).resolve()),
            *(str(image) for image in images),
            "--output",
            str(output_dir),
            "--repetitions",
            str(repetitions),
            "--mode",
            mode,
        ]
        result = subprocess.run(command, text=True, capture_output=True, check=False)
        if result.returncode:
            raise RuntimeError(f"Falló {mode}: {result.stderr.strip() or result.stdout.strip()}")
        mode_reports.append(json.loads((output_dir / f"{mode}-results.json").read_text()))

    report = {
        "model": MODEL,
        "provider": "CPUExecutionProvider",
        "threads": int(os.environ["OMP_NUM_THREADS"]),
        "platform": f"{platform.system()} {platform.machine()}",
        "python": platform.python_version(),
        "repetitions_per_image": repetitions,
        "alpha_matting_parameters": ALPHA_PARAMETERS,
        "images": [
            {
                "input": str(image),
                "normal_png": str(output_path(output_dir, index, image, len(images), "normal")),
                "alpha_matting_png": str(
                    output_path(output_dir, index, image, len(images), "alpha-matting")
                ),
            }
            for index, image in enumerate(images)
        ],
        "modes": mode_reports,
    }
    (output_dir / "results.json").write_text(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ISNet normal vs alpha matting en CPU")
    parser.add_argument("images", nargs="+", type=Path, help="Imágenes JPG/PNG")
    parser.add_argument("--output", required=True, type=Path, help="Carpeta de resultados")
    parser.add_argument("--repetitions", type=int, default=3, help="Repeticiones por imagen (mínimo 3)")
    parser.add_argument("--mode", choices=MODES, help=argparse.SUPPRESS)
    args = parser.parse_args()

    try:
        if args.repetitions < 3:
            raise ValueError("Se necesitan al menos 3 repeticiones consecutivas por imagen.")
        images = [image.resolve() for image in args.images]
        output_dir = args.output.resolve()
        report = (
            benchmark_mode(images, output_dir, args.repetitions, args.mode)
            if args.mode
            else compare(images, output_dir, args.repetitions)
        )
        if not args.mode:
            print(json.dumps(report, indent=2))
    except (OSError, ValueError, RuntimeError) as error:
        parser.exit(1, f"Error: {error}\n")
