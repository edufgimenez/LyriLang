**English** | [Português (Brasil)](README.pt-BR.md)

# LyriLang

Browser extension that shows, below each lyric line on [Spotify Web](https://open.spotify.com), the same line translated into the language you choose.

Works on Firefox (142+) and Chrome (121+) with the same files. The extension interface is available in English and Portuguese (Brazil), following the browser language.

> LyriLang is an independent project and is not affiliated with, sponsored by, or endorsed by Spotify.

## How it works

- `extension/src/content.js` watches the Spotify page, reads the lyric lines (`[data-testid="lyrics-line"]`) and inserts the translation inside each line. Since Spotify recreates these lines all the time, the translation is reapplied from an in-memory map.
- `extension/src/background.js` translates the whole lyrics at once using the free (unofficial) Google Translate endpoint and caches the result in `storage.local`.
- `extension/popup/` lets you turn the translation on or off, choose the target language and turn on your own lyrics colors.
- `extension/options/` lets you choose the lyrics look (background color or your own image as a wallpaper, current line and other lines colors, text shadow), replacing the colors Spotify generates from the album cover. It overrides the `--lyrics-color-*` CSS variables Spotify sets, so it does not depend on Spotify class names.

> The lyric text is sent to Google Translate to be translated. See the [privacy policy](PRIVACY.md).

## Structure

```
extension/   ← the extension itself (what goes into the zip, for Firefox and Chrome)
  _locales/  ← interface texts (en, pt_BR)
assets/      ← icon source (1024px) and the previous icon (legacy-icon/), not included in the zip
docs/        ← project documents (not included in the zip)
```

## Development

```sh
npm install
npm run lint     # validates the extension with web-ext
npm start        # opens Firefox with a clean profile and the extension loaded
npm run build    # creates the .zip in web-ext-artifacts/ (only with the contents of extension/)
```

### Load it in your Firefox (with your Spotify login)

1. Open `about:debugging#/runtime/this-firefox`.
2. Click **Load Temporary Add-on…** and choose `extension/manifest.json`.
3. Open the lyrics of a song on Spotify Web and choose the language in the extension popup.

### Chrome (via GitHub)

The extension is not on the Chrome Web Store. To use it on Chrome:

1. Download the `.zip` of the latest version from [Releases](https://github.com/edufgimenez/LyriLang/releases) and unzip it, or clone this repository.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Click **Load unpacked** and choose the unzipped folder (or the repository's `extension/` folder).
