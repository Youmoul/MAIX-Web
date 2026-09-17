# MAIX Web

Online frontend for MAIX A. Maestro chat and SAMPLE generation are proxied server-side to RunPod so the API key never reaches browser JavaScript.

## Required environment variables

RUNPOD_ENDPOINT_ID=ifw5hjgl54ynzv
RUNPOD_API_KEY=your_private_key

Never commit the API key to GitHub.

## Deploy

Import this repository into a Next.js-compatible host, set the two environment variables in the host's secret/environment settings, then deploy.

## Current v1

- Maestro conversational composition
- Exact SAMPLE generation button/trigger
- BPM default 92
- 5–30 second duration
- Optional MP3/WAV reference
- WAV playback and download

Chop Mode is the next module.
