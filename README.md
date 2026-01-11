# Semantic Forensic Audio (Vite + React + WASM)

Browser-based forensic audio workstation with dual waveforms, DeepFilter-style reconstruction, CLAP semantic search, and optional MP4 video preview.

## Quick start

```bash
npm install
npm run dev
```

## Features

- Upload WAV / M4A / MP4 (ffmpeg.wasm used to extract audio from video).
- Dual Wavesurfer views with zoom/pan, loop regions, and semantic match overlays.
- Reconstruction controls (phase gain, stochastic/periodic blend) with a DeepFilterNet-style offline render stub.
- CLAP (`Xenova/clap-htsat-unfused`) semantic search that highlights likely matching regions.
- Video preview for MP4 and WAV export of reconstructed audio.

## WASM assets

- `vite.config.ts` sets `COOP/COEP` headers to enable SharedArrayBuffer.
- For offline ffmpeg, place `ffmpeg-core.js` and `ffmpeg-core.wasm` under `public/ffmpeg/` (or let `@ffmpeg/ffmpeg` fetch them from the CDN).
- DeepFilterNet3 WASM is stubbed; drop your compiled model under `public/wasm/` and extend `deepFilterEngine.ts` to load it.

## Notes

- `@xenova/transformers` loads the CLAP model in-browser; first run may be slow while weights stream in.
- Loop regions are created by clicking the waveform; drag to refine. Semantic matches render as cyan overlays. Export is available once reconstruction runs.
