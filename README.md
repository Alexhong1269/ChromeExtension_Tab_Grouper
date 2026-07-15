# ChromeExtension_Tab_Grouper

A simple Chrome extension that automatically groups your tabs by domain. Once you have 2+ tabs open from the same site, they get grouped together with a consistent color.

## Features

- Automatically detects tabs from the same domain and groups them
- Assigns each domain a consistent color (based on a hash of the domain name)
- Skips grouping for lone tabs (won't clutter your tab bar with single-tab groups)
- Toggle on/off from the popup
- Works across multiple windows

## File structure

\```
tab-auto-grouper/
├── manifest.json      # Extension config: permissions, background script, popup
├── background.js       # Core logic: watches tabs, groups them by domain
├── popup.html           # Popup UI shown when clicking the extension icon
├── popup.js               # Popup logic: reads/writes the enabled toggle
├── icon16.png            # Toolbar icon (16x16)
├── icon48.png            # Extensions page icon (48x48)
└── icon128.png          # Chrome Web Store / install icon (128x128)
\```

## How it works

1. `background.js` runs as a service worker and listens for tab events (`onUpdated`, `onCreated`, `onAttached`).
2. On any relevant event, it schedules a debounced "regroup" pass for that window (800ms delay, so rapid tab changes don't trigger repeated regroups).
3. The regroup pass buckets all tabs in the window by domain (extracted from the URL, stripping `www.`).
4. Any domain with 2+ tabs either joins an existing tab group with that domain name, or gets a brand-new group created and colored.
5. `popup.html`/`popup.js` let you flip an `enabled` flag in `chrome.storage.sync`, which `background.js` checks before doing any grouping.

## Installation (development mode)

1. Clone or download this folder.
2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select this folder.
5. Open a couple of tabs from the same site and watch them group automatically.

## Permissions used

| Permission  | Why it's needed |
|---|---|
| `tabs` | Read tab URLs and move tabs into groups |
| `tabGroups` | Create, query, and update tab groups |
| `storage` | Persist the enabled/disabled toggle |

## Ideas for extending this

- Minimum-tab threshold setting (currently hardcoded to 2)
- Per-site ignore list
- Auto-collapse groups after creation
- Manual "regroup now" button in the popup
- Group by parent domain vs. subdomain (e.g. treat `docs.google.com` and `mail.google.com` separately or together)

## License

MIT