[English](README.md) | **Português (Brasil)**

# LyriLang

Extensão de navegador que mostra, abaixo de cada linha da letra no [Spotify Web](https://open.spotify.com), a mesma linha traduzida para o idioma que você escolher.

Funciona no Firefox (142+) e no Chrome (121+) com os mesmos arquivos. A interface da extensão está disponível em inglês e português (Brasil), de acordo com o idioma do navegador.

> O LyriLang é um projeto independente e não é afiliado, patrocinado nem endossado pelo Spotify.

## Como funciona

- `extension/src/content.js` observa a página do Spotify, lê as linhas (`[data-testid="lyrics-line"]`) e coloca a tradução dentro de cada linha. Como o Spotify recria essas linhas o tempo todo, a tradução é reaplicada a partir de um mapa em memória.
- `extension/src/background.js` traduz a letra inteira de uma vez, usando o endpoint gratuito do Google Tradutor (não oficial), e guarda o resultado em cache no `storage.local`.
- `extension/popup/` permite ligar e desligar a tradução, escolher o idioma de destino e ativar as suas próprias cores da letra.
- `extension/options/` permite escolher o visual da letra (cor de fundo ou uma imagem sua como wallpaper, cores da linha atual e das próximas linhas, sombra no texto), no lugar das cores que o Spotify gera a partir da capa do álbum. A extensão sobrescreve as variáveis CSS `--lyrics-color-*` que o Spotify define, então não depende dos nomes das classes do Spotify.

> O texto das letras é enviado ao Google Tradutor para ser traduzido. Veja a [política de privacidade](PRIVACY.pt-BR.md).

## Estrutura

```
extension/   ← a extensão em si (é o que vai no zip, para Firefox e Chrome)
  _locales/  ← textos da interface (en, pt_BR)
docs/        ← documentos do projeto (não entram no zip)
```

## Desenvolvimento

```sh
npm install
npm run lint     # valida a extensão com o web-ext
npm start        # abre um Firefox com perfil limpo e a extensão carregada
npm run build    # gera o .zip em web-ext-artifacts/ (só com o conteúdo de extension/)
```

### Carregar no seu Firefox (com o seu login do Spotify)

1. Abra `about:debugging#/runtime/this-firefox`.
2. Clique em **Carregar extensão temporária…** e escolha `extension/manifest.json`.
3. Abra a letra de uma música no Spotify Web e escolha o idioma no popup da extensão.

### Chrome (via GitHub)

A extensão não está na Chrome Web Store. Para usar no Chrome:

1. Baixe o `.zip` da versão mais recente em [Releases](https://github.com/edufgimenez/LyriLang/releases) e descompacte, ou clone este repositório.
2. Abra `chrome://extensions` e ative o **Modo do desenvolvedor**.
3. Clique em **Carregar sem compactação** e escolha a pasta descompactada (ou a pasta `extension/` do repositório).
