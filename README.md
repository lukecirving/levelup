# LevelUp

A personal golf / gym / habit / diet tracker, built around a specific constraint: gym trips depend on getting a ride, but home golf practice (turf, net, mat) is available almost any day. LevelUp helps plan around that, log real training, and track progress toward making the golf team.

Plain HTML/CSS/JS, no build step, no backend — all data stays on-device (`localStorage`). Installable to your phone's home screen as a PWA.

## Status

Early build, in progress. Current: app shell, theming, local storage layer, and Settings (goal date, units, backup/restore). Schedule, gym logging, golf drills, habits/diet, progress charts, and full PWA install/offline support are coming next.

## Running locally

No build step — just serve the folder statically, e.g.:

```
python3 -m http.server 8000
```

then open `http://localhost:8000`.

## Data & backups

Everything is stored only in your browser on the device you use it on. Use **Settings → Export backup** regularly, and **Import backup** to restore or move to a new device.
