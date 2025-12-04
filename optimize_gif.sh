#!/bin/bash
# Optimize GIF files to reduce size
# Usage: ./optimize_gif.sh input.gif output.gif [max_width]

if [ $# -lt 2 ]; then
    echo "Usage: $0 input.gif output.gif [max_width]"
    echo "Example: $0 demo.gif demo_optimized.gif 800"
    exit 1
fi

INPUT="$1"
OUTPUT="$2"
MAX_WIDTH="${3:-800}"  # Default to 800px width

if [ ! -f "$INPUT" ]; then
    echo "Error: Input file not found: $INPUT"
    exit 1
fi

# Check if gifsicle is installed
if ! command -v gifsicle &> /dev/null; then
    echo "Installing gifsicle..."
    sudo apt-get update && sudo apt-get install -y gifsicle
fi

# Get original size
ORIGINAL_SIZE=$(du -h "$INPUT" | cut -f1)
echo "Original size: $ORIGINAL_SIZE"

# Optimize: resize, reduce colors, and optimize frames
echo "Optimizing GIF..."
gifsicle --optimize=3 --colors 128 --resize-width "$MAX_WIDTH" "$INPUT" > "$OUTPUT"

# Get optimized size
OPTIMIZED_SIZE=$(du -h "$OUTPUT" | cut -f1)
echo "Optimized size: $OPTIMIZED_SIZE"
echo "Output: $OUTPUT"
