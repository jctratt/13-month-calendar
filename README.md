# 13-Month Calendar

Static React + TypeScript planner that remaps the regular Gregorian year into thirteen fixed 28-day months while keeping the real Gregorian dates visible on every tile.

## Calendar model

- The main grid always contains 13 months of 28 days, for 364 mapped days.
- Gregorian dates stay intact. A tile shows the real month and day, plus the fixed day number `1-28` in the corner.
- `Dec 31` is a standalone `Solar Day` every year and does not appear inside a fixed month.
- `Dec 30` joins it in leap years as an extra standalone year-end day.

For 2026, the fourth fixed month runs from `Mar 26` through `Apr 22`, so `Mar 27, 2026` lands on fixed month `4`, day `2`.

## Planner features

- `Day`, `Week`, `Month`, and `Year` views all work from the same selected date.
- `1`, `2`, and `3` column layouts let you change how the week and year views are packed.
- Each real Gregorian date can store multiple appointments and one note.
- Appointments support `all day` and `repeat yearly` options for dates like birthdays and anniversaries.
- The top controls stay available as a compact floating toolbar while the planner card remains visible beside the calendar.
- `Today` returns focus to the current date while keeping the destination visible below the floating header.
- Data is stored in `localStorage`, so it survives reloads and can follow browser profiles where site storage is synced.
- Changes also react to the browser `storage` event, so multiple tabs stay aligned.

## Appointment behavior

- Appointment titles are shown directly on calendar summaries instead of generic numbered labels.
- Yearly recurring appointments are stored once on their original date and appear automatically on the same month/day in later years.
- Notes stay date-specific and do not recur across years.
- Empty records are removed automatically when a date has no note and no appointments.

## UI behavior

- The floating toolbar contains previous/next navigation, direct year jump, view switching, column count, month jump, and `Today`.
- The planner card on the right stays below the floating header and keeps the full selected-date context visible while editing.
- Special year-end days outside the fixed 13-month grid still support appointments and notes.

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
