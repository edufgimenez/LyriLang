# LyriLang — Auditoria de preparação para publicação

> **Objetivo:** instruir o Claude Code a **avaliar o projeto existente**, identificar riscos e propor ajustes antes da publicação no Firefox Add-ons (AMO) e na Chrome Web Store. **Não implemente mudanças nesta primeira etapa.** Primeiro inspecione o repositório e entregue um relatório fundamentado em arquivos e trechos de código.

## Contexto

LyriLang é uma extensão de navegador que acrescenta traduções abaixo das linhas de letras exibidas no Spotify Web. O projeto está sendo desenvolvido inicialmente para Firefox, com intenção de oferecer uma versão para Chrome.

**Não presuma** qual serviço de tradução é usado, se existe backend, se há cache, se os textos são armazenados ou se a extensão coleta dados. Descubra tudo isso no código. Não trate este documento como confirmação de conformidade jurídica ou aprovação pelas lojas.

## Instruções para a auditoria

1. Inspecione os manifests, scripts de conteúdo, background/service worker, popup/options, chamadas de rede, bibliotecas, configurações, arquivos de build, documentação e testes.
2. Para **cada item abaixo**, marque: **Conforme / Parcial / Não conforme / Não se aplica / Não verificável**.
3. Registre **evidências concretas**: caminhos de arquivos, funções, permissões, endpoints, exemplos de fluxo e, quando possível, linhas.
4. Diferencie **fato observado**, **risco potencial**, **recomendação técnica** e **ponto que exige análise jurídica ou confirmação externa**.
5. Classifique cada achado por severidade (**Crítico / Alto / Médio / Baixo**) e esforço estimado (**Baixo / Médio / Alto**).
6. Não altere arquivos, dependências, configurações ou código sem minha aprovação. Ao final, apresente um plano priorizado e aguarde autorização.
7. Nunca exponha valores de tokens, chaves, credenciais ou dados pessoais no relatório; indique apenas a localização e a natureza do problema.

---

## 1. Permissões e escopo de acesso

- [ ] Identificar todas as permissões em `permissions`, `host_permissions`, `optional_permissions`, `content_scripts.matches` e outras configurações relevantes.
- [ ] Justificar tecnicamente cada permissão com referência à funcionalidade que a utiliza.
- [ ] Confirmar que o content script só executa nos domínios necessários (idealmente `https://open.spotify.com/*`, caso seja suficiente).
- [ ] Verificar se há permissões excessivas (`<all_urls>`, `tabs`, `webRequest`, `scripting`, acesso amplo a hosts etc.) e propor alternativas de menor privilégio.
- [ ] Avaliar permissões necessárias para chamadas a APIs externas, diferenciando requisições feitas pelo content script das feitas pelo background/service worker.
- [ ] Confirmar que o armazenamento local é limitado ao necessário (por exemplo, preferências de idioma), sem guardar letras por padrão.
- [ ] Verificar uso de código remoto, scripts externos ou execução dinâmica incompatível com políticas de extensões.

**Entregável:** tabela `Permissão | Onde declarada | Onde usada | Necessária? | Ajuste sugerido`.

## 2. Privacidade, transmissão de dados e segurança

- [ ] Mapear o fluxo completo: captura da letra no DOM → processamento → requisição de tradução → resposta → inserção da tradução no DOM.
- [ ] Identificar **todos** os serviços externos, endpoints, SDKs e provedores de tradução utilizados.
- [ ] Informar exatamente quais dados saem do navegador: texto integral ou trechos, título, artista, idioma, URL, identificadores, cookies, tokens, IP (quando aplicável) e metadados.
- [ ] Identificar se há consentimento, aviso claro ao usuário ou acionamento voluntário da tradução; verificar se algum envio acontece automaticamente.
- [ ] Verificar se há logs, analytics, telemetria, tratamento de erros ou serviços de terceiros que recebem letras ou dados de navegação.
- [ ] Investigar cache, `localStorage`, `browser.storage`/`chrome.storage`, IndexedDB, memória e backend: o que é retido, por quanto tempo, como é removido e se o usuário pode controlar isso.
- [ ] Conferir documentação e condições do provedor de tradução sobre retenção, uso para treinamento, compartilhamento e tratamento de dados; se não for possível confirmar, marcar **Não verificável** e listar a documentação a consultar.
- [ ] Procurar chaves secretas e tokens embutidos no bundle ou repositório; avaliar riscos de abuso, custos e exposição. **Não mostrar os segredos**.
- [ ] Avaliar se é necessário backend/proxy para proteger credenciais, com os trade-offs de privacidade e custo.
- [ ] Revisar prevenção de XSS/injeção ao inserir conteúdo traduzido no DOM (`textContent` vs. `innerHTML`), sanitização e validação de mensagens entre scripts.
- [ ] Verificar se existem chamadas desnecessárias ou repetidas à API e se há controles de limite e falha.

**Entregáveis:** diagrama textual de fluxo de dados e tabela `Dado | Origem | Destino | Finalidade | Retenção | Evidência`.

## 3. Política de privacidade e declarações nas lojas

- [ ] Verificar se existe política de privacidade pública e se corresponde **exatamente** ao comportamento real.
- [ ] Identificar informações a divulgar: dados processados, terceiros, finalidade, retenção, controles do usuário, contato e mudanças na política.
- [ ] Avaliar exigências atuais de declaração de privacidade da Chrome Web Store e do Firefox AMO; consultar documentação oficial atualizada antes de afirmar requisitos.
- [ ] Verificar o campo de práticas de dados do Firefox (`browser_specific_settings.gecko.data_collection_permissions`) conforme a versão do Firefox e os requisitos atuais, sem inventar valores.
- [ ] Preparar **um rascunho** de política de privacidade apenas depois de confirmar os fluxos reais; marcar lacunas e perguntas pendentes.
- [ ] Verificar se a descrição da loja promete mais privacidade do que o código realmente entrega.

**Entregável:** checklist de informações para os formulários das duas lojas + rascunho condicionado às evidências.

## 4. Marca Spotify e comunicação pública

- [ ] Confirmar que nome, ícone, imagens e textos não se apresentam como oficiais ou endossados pelo Spotify.
- [ ] Verificar se são usados logotipos, marcas, artes ou outros elementos protegidos de forma potencialmente indevida.
- [ ] Avaliar capturas de tela da loja: evitar exibir letras completas e conteúdo protegido sem base de uso apropriada.
- [ ] Sugerir descrição de compatibilidade neutra, por exemplo: “LyriLang adiciona traduções às letras exibidas no Spotify Web”.
- [ ] Sugerir aviso: “LyriLang é um projeto independente e não é afiliado, patrocinado ou endossado pelo Spotify.”
- [ ] Revisar as diretrizes oficiais de marca e os termos relevantes do Spotify, distinguindo restrições técnicas, contratuais e de marca.

**Entregável:** revisão dos textos e recursos visuais existentes, com recomendações objetivas.

## 5. Direitos autorais, letras e traduções — prioridade alta

- [ ] Identificar **como** as letras são obtidas: leitura do DOM já exibido, interceptação de rede, API oficial/não oficial, scraping, bibliotecas de terceiros ou outra forma.
- [ ] Determinar se a extensão copia, transmite, transforma, armazena, compartilha ou redistribui letras e traduções completas.
- [ ] Identificar se traduções são persistidas localmente, em servidores, em cache compartilhado ou acessíveis a outros usuários.
- [ ] Verificar se existe catálogo, banco de letras, exportação ou funcionalidade que redistribua conteúdo protegido.
- [ ] Avaliar alternativas técnicas que minimizem cópia, retenção, transmissão e redistribuição, sem afirmar que isso por si só torna o uso legal.
- [ ] Identificar condições de uso do Spotify e dos serviços de letras/tradução que possam restringir extração, modificação, tradução ou envio a terceiros.
- [ ] **Não concluir que “uso local”, “sem fins lucrativos”, “apenas DOM” ou “sem armazenamento” equivale automaticamente a autorização.** Traduções podem constituir obras derivadas e direitos de terceiros podem estar envolvidos.
- [ ] Registrar explicitamente questões que exigem autorização/licenciamento ou avaliação jurídica antes de uma distribuição pública mais ampla.

**Entregável:** matriz `Operação com conteúdo | Como ocorre hoje | Risco técnico/contratual/autoral | Alternativa | Necessita validação jurídica?`.

## 6. Compatibilidade e preparação de publicação (secundário)

- [ ] Identificar diferenças de APIs, manifests e empacotamento entre Firefox e Chrome.
- [ ] Verificar CSP, Manifest V3, background/service worker, permissões e comportamento de atualização.
- [ ] Confirmar que builds reproduzíveis não incluem segredos, arquivos de desenvolvimento ou dependências desnecessárias.
- [ ] Verificar requisitos atuais das lojas para código minificado/gerado e, no Firefox, eventual entrega de código-fonte e instruções de build.
- [ ] Validar comportamento com troca de música, mudança de idioma, ausência de letra, erros de API, navegação SPA e alterações no DOM do Spotify.

---

## Formato obrigatório da resposta

### A. Resumo executivo

- Estado geral para publicação: **Pronto / Pronto com ressalvas / Não pronto / Indeterminado**.
- Três a cinco principais riscos, ordenados por prioridade.
- O que já está bem implementado.
- O que não foi possível verificar.

### B. Inventário da arquitetura atual

Descrever arquivos principais, serviços externos, permissões e fluxo real da tradução. Não presumir componentes inexistentes.

### C. Auditoria por tópico

Para cada um dos seis tópicos, apresentar tabela:

| Item | Status | Severidade | Evidência (arquivo/linha) | Risco | Recomendação | Esforço |
|---|---|---|---|---|---|---|

### D. Plano de ação priorizado

Separar em:

1. **Bloqueadores antes de publicar**;
2. **Melhorias recomendadas antes de publicar**;
3. **Melhorias futuras**;
4. **Dúvidas jurídicas/contratuais que não podem ser resolvidas apenas com código**.

Para cada ação, explicar o que mudaria, em quais arquivos, por quê e como testar.

### E. Perguntas para mim

Fazer apenas perguntas que o código não permite responder, especialmente sobre serviço de tradução, política de dados, intenção de distribuição e eventuais licenças/autorização.

### F. Encerramento

**Não implemente nada ainda.** Peça minha autorização para executar o plano, preferencialmente em etapas pequenas e verificáveis.

## Referências oficiais para consulta

- Chrome Web Store — políticas: https://developer.chrome.com/docs/webstore/program-policies/
- Chrome Web Store — publicação: https://developer.chrome.com/docs/webstore/publish/
- Chrome Extensions — permissões: https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
- Firefox — submissão: https://extensionworkshop.com/documentation/publish/submitting-an-add-on/
- Mozilla — políticas de add-ons: https://extensionworkshop.com/documentation/publish/add-on-policies/
- Spotify — termos e políticas: https://developer.spotify.com/terms

> As políticas podem mudar. Consulte as versões vigentes e não trate esta auditoria técnica como parecer jurídico.
