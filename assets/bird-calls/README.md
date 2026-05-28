# Bird Call Audio Assets

Put final bird call files in this folder using the bird id as the filename.

Required filename pattern:

```text
{bird-id}.mp3
```

Example:

```text
sparrow.mp3
yellow-rumped-warbler.mp3
```

Recommended format:

- MP3
- About 8 seconds or shorter
- 96 kbps
- Mono preferred
- No long silence at the beginning
- Gentle fade out at the end

Run `npm run audio:optimize` after adding source files. The script keeps the
same filenames, backs up originals to `assets/bird-calls-original/`, trims long
files to 8 seconds, converts to mono 96 kbps MP3, and applies a short fade out.
