#!/usr/bin/env bash
# Download IBM TechQA (CDLA-Permissive-1.0) from its official home on Hugging Face,
# verify the archive checksum, and keep only the train/dev files Sidekick uses.
# Streams the 2.96 GB archive; the 2.7 GB full technote corpus is never written to disk.
set -euo pipefail

URL="https://huggingface.co/datasets/PrimeQA/TechQA/resolve/main/TechQA.tar.gz"
SHA256="6b094ef9a69718f727ce8d7e15c4d961e51032cefaa952e0d6af9d176d7ba118"
OUT="data/techqa/raw"

mkdir -p "$OUT"
sumfile="$(mktemp)"
trap 'rm -f "$sumfile"' EXIT

curl -fsSL --retry 3 "$URL" \
  | tee >(sha256sum | cut -d' ' -f1 > "$sumfile") \
  | tar -xzf - -C "$OUT" --strip-components=1 \
      TechQA/README.txt \
      TechQA/CDLA-Permissive-v1.0.pdf \
      TechQA/training_and_dev/dev_Q_A.json \
      TechQA/training_and_dev/training_dev_technotes.json
# The checksum runs in a process substitution; wait for it to write its result.
for _ in $(seq 1 30); do [[ -s "$sumfile" ]] && break; sleep 1; done

actual="$(cat "$sumfile")"
if [[ "$actual" != "$SHA256" ]]; then
  echo "Checksum mismatch: expected $SHA256, got $actual" >&2
  rm -rf "$OUT"
  exit 1
fi
echo "TechQA verified ($SHA256) and extracted to $OUT"
