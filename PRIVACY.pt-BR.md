[English](PRIVACY.md) | **Português (Brasil)**

# Política de privacidade do LyriLang

Última atualização: 20 de outubro de 2026

O LyriLang é uma extensão de navegador que mostra a tradução das letras exibidas no Spotify Web (`open.spotify.com`). Esta política descreve quais dados a extensão usa, para onde eles vão e como você pode controlá-los.

## Dados enviados para fora do seu navegador

Quando a tradução está ligada e você abre a tela de letra de uma música no Spotify Web, a extensão envia ao **Google Tradutor** (`translate.googleapis.com`):

- o texto das linhas da letra que estão na tela, sem as linhas repetidas;
- o código do idioma de destino escolhido (por exemplo, `pt` ou `en`).

Esse envio serve só para traduzir as linhas, e acontece automaticamente ao abrir uma letra. Para impedir o envio, desligue a opção **Mostrar tradução** no popup da extensão.

Como em qualquer requisição na internet, o Google recebe o endereço IP do seu dispositivo. A requisição é feita **sem cookies**. O tratamento desses dados pelo Google segue a [Política de Privacidade do Google](https://policies.google.com/privacy).

## Dados que a extensão não envia

- título da música, artista ou álbum;
- dados da sua conta do Spotify, cookies ou tokens;
- histórico de navegação ou outras páginas que você visita.

A extensão não usa analytics, telemetria nem servidor próprio. O desenvolvedor do LyriLang não recebe nenhum dado seu.

## Dados guardados no seu navegador

- **Preferências** (tradução ligada ou desligada, idioma de destino): ficam no `storage.sync` do navegador. Se a sincronização do Firefox ou do Chrome estiver ativa, o próprio navegador sincroniza esses dados entre os seus dispositivos.
- **Traduções em cache**: as traduções das letras ficam no `storage.local` do navegador, para não traduzir a mesma música de novo. Cada tradução expira em **30 dias**, e o cache guarda no máximo 200 músicas. Para apagar tudo na hora, use o botão **Limpar traduções salvas** no popup. As letras originais não são guardadas, só um identificador (hash) usado para localizar a tradução.

Remover a extensão apaga todos esses dados.

## Mudanças nesta política

Qualquer alteração é publicada neste arquivo, com a data de atualização acima. O histórico completo fica no repositório do projeto.

## Contato

Dúvidas ou solicitações: abra uma issue em <https://github.com/edufgimenez/LyriLang/issues>.

---

O LyriLang é um projeto independente e não é afiliado, patrocinado nem endossado pelo Spotify.
