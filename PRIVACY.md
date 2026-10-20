**English** | [Português (Brasil)](PRIVACY.pt-BR.md)

# LyriLang Privacy Policy

Last updated: October 20, 2026

LyriLang is a browser extension that shows translations of the lyrics displayed on Spotify Web (`open.spotify.com`). This policy describes which data the extension uses, where it goes, and how you can control it.

## Data sent outside your browser

When the translation is turned on and you open the lyrics view of a song on Spotify Web, the extension sends to **Google Translate** (`translate.googleapis.com`):

- the text of the lyric lines shown on the screen, without repeated lines;
- the code of the chosen target language (for example, `pt` or `en`).

This is sent only to translate the lines, and it happens automatically when you open the lyrics. To stop it, turn off **Show translation** in the extension popup.

As with any request on the internet, Google receives your device's IP address. The request is made **without cookies**. Google's handling of this data is governed by the [Google Privacy Policy](https://policies.google.com/privacy).

## Data the extension does not send

- song title, artist, or album;
- your Spotify account data, cookies, or tokens;
- your browsing history or other pages you visit.

The extension does not use analytics, telemetry, or its own server. The LyriLang developer does not receive any of your data.

## Data stored in your browser

- **Preferences** (translation on or off, target language, custom lyrics colors and look): stored in the browser's `storage.sync`. If Firefox or Chrome sync is enabled, the browser itself syncs this data across your devices.
- **Cached translations**: lyric translations are stored in the browser's `storage.local` so the same song is not translated again. Each translation expires after **30 days**, and the cache keeps at most 200 songs. To delete everything right away, use the **Clear saved translations** button in the popup. The original lyrics are not stored, only an identifier (hash) used to find the translation.
- **Background image** (optional): if you choose an image for the lyrics background, it is resized and stored only in the browser's `storage.local`. It is never sent anywhere and is not synced to other devices. To delete it, use **Remove** on the extension options page.

Removing the extension deletes all of this data.

## Changes to this policy

Any change is published in this file, with the update date above. The full history is available in the project repository.

## Contact

Questions or requests: open an issue at <https://github.com/edufgimenez/LyriLang/issues>.

---

LyriLang is an independent project and is not affiliated with, sponsored by, or endorsed by Spotify.
