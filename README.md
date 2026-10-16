# LyriLang

Extensão de navegador que mostra, abaixo de cada linha da letra no [Spotify Web](https://open.spotify.com), a mesma linha traduzida para o idioma que você escolher.

Funciona no Firefox (121+) e no Chrome (121+) com o mesmo `manifest.json`.

## Como funciona

- `src/content.js` observa a página do Spotify, lê as linhas (`[data-testid="lyrics-line"]`) e coloca a tradução dentro de cada linha. Como o Spotify recria essas linhas o tempo todo, a tradução é reaplicada a partir de um mapa em memória.
- `src/background.js` traduz a letra inteira de uma vez, usando o endpoint gratuito do Google Tradutor (não oficial), e guarda o resultado em cache no `storage.local`.
- `popup/` permite ligar e desligar a tradução e escolher o idioma de destino.

> O texto das letras é enviado ao Google Tradutor para ser traduzido.

## Desenvolvimento

```sh
npm install
npm run lint     # valida a extensão com o web-ext
npm start        # abre um Firefox com perfil limpo e a extensão carregada
npm run build    # gera o .zip em web-ext-artifacts/
```

### Carregar no seu Firefox (com o seu login do Spotify)

1. Abra `about:debugging#/runtime/this-firefox`.
2. Clique em **Carregar extensão temporária…** e escolha o `manifest.json`.
3. Abra a letra de uma música no Spotify Web e escolha o idioma no popup da extensão.

### Carregar no Chrome

1. Abra `chrome://extensions` e ative o **Modo do desenvolvedor**.
2. Clique em **Carregar sem compactação** e escolha a pasta do projeto.
