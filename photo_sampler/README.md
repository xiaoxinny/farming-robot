# Photo Sampler

A Python script for extracting frames from video files at a specified frames-per-second rate.

## Features

- Extract frames at any FPS rate (e.g., 1 frame/sec, 2 frames/sec, or 0.5 frames/sec)
- Timestamp-based filenames for easy reference
- Optional frame resizing with high-quality Lanczos interpolation
- Supports MP4, AVI, MOV, MKV, and WebM formats
- PNG output for lossless quality

## Installation

```bash
cd photo_sampler
pip install -r requirements.txt
```

## Usage

```bash
python sample_frames.py <video_file> [options]
```

### Arguments

| Argument | Description |
|----------|-------------|
| `video` | Path to input video file (required) |
| `--fps` | Frames to extract per second (default: 1.0) |
| `--output`, `-o` | Output directory (default: `./frames_<video_name>`) |
| `--resize`, `-r` | Resize frames to WxH (e.g., `1280x720`) |

### Examples

Extract 1 frame per second (default):
```bash
python sample_frames.py video.mp4
```

Extract 2 frames per second to a custom directory:
```bash
python sample_frames.py video.mp4 --fps 2 --output ./my_frames
```

Extract 1 frame every 2 seconds (0.5 fps):
```bash
python sample_frames.py video.mp4 --fps 0.5
```

Extract frames and resize to 640x480:
```bash
python sample_frames.py video.mp4 --fps 1 --resize 640x480
```

Combine all options:
```bash
python sample_frames.py video.mp4 --fps 2 --output ./frames --resize 1280x720
```

## Output

Frames are saved as PNG files with timestamp-based names in the format `frame_MM_SS_mmm.png`:

```
frames_video/
├── frame_00_00_000.png   # 0 minutes, 0 seconds, 0 milliseconds
├── frame_00_01_000.png   # 0 minutes, 1 second, 0 milliseconds
├── frame_00_02_000.png   # 0 minutes, 2 seconds, 0 milliseconds
└── ...
```

## Requirements

- Python 3.8+
- OpenCV (`opencv-python`)
