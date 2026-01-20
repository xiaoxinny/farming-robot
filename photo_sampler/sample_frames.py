#!/usr/bin/env python3
"""
Video Frame Sampler

Extracts frames from an MP4 video at a specified frames-per-second rate.
Supports timestamp-based naming and optional resizing.

Usage:
    python sample_frames.py input.mp4 --fps 2 --output ./frames --resize 1280x720
"""

import argparse
import sys
from pathlib import Path

try:
    import cv2
except ImportError:
    print("Error: OpenCV not installed. Run: pip install opencv-python")
    sys.exit(1)


def parse_resize(resize_str: str) -> tuple[int, int]:
    """Parse resize string 'WxH' into (width, height) tuple."""
    try:
        width, height = resize_str.lower().split('x')
        return int(width), int(height)
    except ValueError:
        raise argparse.ArgumentTypeError(
            f"Invalid resize format '{resize_str}'. Use WxH (e.g., 1280x720)"
        )


def format_timestamp(seconds: float) -> str:
    """Convert seconds to MM_SS_mmm format for filename."""
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{minutes:02d}_{secs:02d}_{millis:03d}"


def sample_frames(
    video_path: Path,
    output_dir: Path,
    target_fps: float,
    resize: tuple[int, int] | None = None,
) -> int:
    """
    Extract frames from video at specified FPS rate.

    Args:
        video_path: Path to input video file
        output_dir: Directory to save extracted frames
        target_fps: Number of frames to extract per second
        resize: Optional (width, height) to resize frames

    Returns:
        Number of frames extracted
    """
    cap = cv2.VideoCapture(str(video_path))

    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video file: {video_path}")

    video_fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / video_fps if video_fps > 0 else 0

    print(f"Video: {video_path.name}")
    print(f"  Duration: {duration:.2f}s | FPS: {video_fps:.2f} | Total frames: {total_frames}")
    print(f"  Sampling at: {target_fps} fps")

    if resize:
        print(f"  Resize to: {resize[0]}x{resize[1]}")

    # Calculate frame interval based on target FPS
    frame_interval = video_fps / target_fps if target_fps > 0 else video_fps

    output_dir.mkdir(parents=True, exist_ok=True)

    frame_count = 0
    extracted_count = 0
    next_extract_frame = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_count >= next_extract_frame:
            # Calculate timestamp
            timestamp_sec = frame_count / video_fps
            timestamp_str = format_timestamp(timestamp_sec)

            # Resize if requested
            if resize:
                frame = cv2.resize(frame, resize, interpolation=cv2.INTER_LANCZOS4)

            # Save frame
            output_path = output_dir / f"frame_{timestamp_str}.png"
            cv2.imwrite(str(output_path), frame)

            extracted_count += 1
            next_extract_frame += frame_interval

            # Progress indicator
            if extracted_count % 10 == 0:
                print(f"  Extracted {extracted_count} frames...", end='\r')

        frame_count += 1

    cap.release()
    print(f"  Extracted {extracted_count} frames to {output_dir}")

    return extracted_count


def main():
    parser = argparse.ArgumentParser(
        description="Extract frames from a video at a specified FPS rate.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s video.mp4 --fps 1
      Extract 1 frame per second

  %(prog)s video.mp4 --fps 2 --output ./my_frames
      Extract 2 frames per second to ./my_frames directory

  %(prog)s video.mp4 --fps 0.5 --resize 640x480
      Extract 1 frame every 2 seconds, resized to 640x480
        """,
    )

    parser.add_argument(
        "video",
        type=Path,
        help="Path to input MP4 video file",
    )

    parser.add_argument(
        "--fps",
        type=float,
        default=1.0,
        help="Frames to extract per second (default: 1.0)",
    )

    parser.add_argument(
        "--output", "-o",
        type=Path,
        default=None,
        help="Output directory for frames (default: ./frames_<video_name>)",
    )

    parser.add_argument(
        "--resize", "-r",
        type=parse_resize,
        default=None,
        help="Resize frames to WxH (e.g., 1280x720)",
    )

    args = parser.parse_args()

    # Validate input file
    if not args.video.exists():
        print(f"Error: Video file not found: {args.video}")
        sys.exit(1)

    if not args.video.suffix.lower() in ('.mp4', '.avi', '.mov', '.mkv', '.webm'):
        print(f"Warning: File may not be a supported video format: {args.video.suffix}")

    # Set default output directory
    if args.output is None:
        args.output = Path(f"./frames_{args.video.stem}")

    # Validate FPS
    if args.fps <= 0:
        print("Error: FPS must be greater than 0")
        sys.exit(1)

    try:
        extracted = sample_frames(
            video_path=args.video,
            output_dir=args.output,
            target_fps=args.fps,
            resize=args.resize,
        )

        if extracted == 0:
            print("Warning: No frames were extracted")
            sys.exit(1)

    except RuntimeError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\nInterrupted by user")
        sys.exit(130)


if __name__ == "__main__":
    main()
