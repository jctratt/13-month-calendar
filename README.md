# 13-Month Calendar

Static React + TypeScript site that remaps the regular Gregorian year into thirteen fixed 28-day months while keeping the real Gregorian dates visible on every tile.

## Calendar model

- The main grid always contains 13 months of 28 days, for 364 mapped days.
- Gregorian dates stay intact. A tile shows the real month and day, plus the fixed day number `1-28` in the corner.
- `Feb 29` is a standalone `Leap Day` in leap years and does not appear inside a fixed month.
- `Dec 31` is a standalone `Solar Day` every year and does not appear inside a fixed month.

For 2026, the fourth fixed month runs from `Mar 26` through `Apr 22`, so `Mar 27, 2026` lands on fixed month `4`, day `2`.

## Scripts

```bash
npm install
npm run dev
npm run build
npm run preview
```

## GitHub Pages

The app is configured as a project site with the Vite base path set to `/13-month-calendar/`.

If the GitHub repository name changes, update the `base` value in `vite.config.ts` to match the repository path.
