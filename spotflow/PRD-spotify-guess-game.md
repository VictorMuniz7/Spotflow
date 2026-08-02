Crie um jogo web de adivinhar músicas usando a API do Spotify. Use Angular + TypeScript com Vite e Tailwind para estilizações (todos na versão `latest`). Caso Tailwind não seja compatível com o setup Angular + Vite escolhido, utilize uma alternativa equivalente (ex.: PostCSS puro ou outra lib de utilitários CSS) mantendo a mesma filosofia utility-first.

**Nome do projeto:** Spotflow

**Referência visual:** `resources/inspiration.webp` — ilustração em traço grosso desenhado à mão (estilo esboço), com efeito de aberração cromática/glitch (contornos duplicados em vermelho e ciano deslocados sobre o preto), fundo levemente acinzentado com textura de ruído/grão, e um tema central de música analógica (rádio/boombox com notas musicais saindo dele). Toda a estética do site (paleta de cores, tipografia, textura de fundo, estilo de ícones/ilustrações) deve ser baseada nessa referência — ver seção 9.

## Tools

### MCP

- Use o [**Context7**](https://context7.com/llms.txt) para documentações atualizadas (Angular, Vite, Tailwind, Spotify Web API / Web Playback SDK)

### Skills

- Utilize a skill /engineering para gerar códigos com boas práticas de desenvolvimento e DX (Developer Experience)
  - Garanta desacoplamentos inteligentes entre componentes para maior manutenibilidade
  - Separe componentes de UI e lógica de negócio (services, state management, etc.)
- Utilize a skill /ui para garantir o equilíbrio entre o visual (UI) e a experiência do usuário (UX)
  - Garanta que toda transição tenha suavidade (a animação final com anime.js será definida posteriormente — deixar pontos de extensão/hooks nos componentes para isso)
  - Garanta que toda interação tenha feedback visual (loading, erro, sucesso, contagem regressiva do áudio, etc.)

## Revisão (Loop)

- Utilize a skill /cdp para comparar visualmente o estado do site com a referência (`resources/inspiration.webp`)
  - Teste contra resoluções de desktop, tablet e mobile
- Utilize a skill /lagune para garantir a segurança do projeto de ponta a ponta, com atenção especial a:
  - Fluxo de autenticação OAuth com o Spotify (tokens não podem vazar no client, uso de PKCE, sem client secret exposto)
  - Armazenamento seguro de tokens (evitar localStorage puro para access/refresh token quando possível, considerar expiração e renovação)

## Sobre o Projeto

Jogo de adivinhação musical em que o usuário conecta sua conta do Spotify, escolhe uma de suas playlists e tenta adivinhar, rodada a rodada, qual música está tocando a partir de um trecho curto de áudio.

### 1. Autenticação

- Login via **Spotify OAuth 2.0 (Authorization Code + PKCE)**, fluxo indicado para SPA (sem backend guardando client secret)
- Escopos necessários: leitura de playlists do usuário (`playlist-read-private`, `playlist-read-collaborative`) e, para a reprodução via Web Playback SDK (ver seção 6, agora obrigatória), `streaming`, `user-read-email`, `user-read-private`, `user-modify-playback-state`
- Após login, o usuário deve ver seu nome/avatar do Spotify como confirmação de conexão
- **Conta Spotify Premium é obrigatória** para jogar (necessária para o Web Playback SDK). Após o login, verificar o campo `product` do perfil do usuário (`GET /me`); se for diferente de `premium`, bloquear o acesso ao jogo e exibir uma tela informando que é necessária uma conta Premium para jogar

### 2. Seleção de Playlist

- Tela listando as playlists do usuário (capa, nome, quantidade de músicas)
- Buscar playlists via `GET /me/playlists`
- Usuário seleciona uma playlist para iniciar o jogo
- Validar que a playlist tenha músicas suficientes para gerar rodadas sem repetição (mínimo sugerido: 10 músicas distintas com áudio disponível)

### 3. Tela de Jogo (por rodada)

- Botão de **Play** central, que ao ser clicado toca **5 segundos** de uma música aleatória (ainda não usada nas rodadas anteriores) da playlist selecionada
- Indicador visual de progresso/contagem dos 5 segundos de reprodução
- Campo de **input** abaixo do player, com autocomplete/sugestões conforme o usuário digita, listando apenas músicas pertencentes à playlist selecionada
- Envio da resposta ao pressionar **Enter** ou clicar em um botão de confirmar
- Indicador de rodada atual (ex.: "Rodada 3 de 10")

### 4. Tela de Resultado da Rodada

Após o envio da resposta, exibir:

- Se acertou ou errou
- Caso tenha acertado: pontuação obtida na rodada, calculada com base na velocidade da resposta (quanto mais rápido, mais pontos)
- Capa, nome e artista(s) da música correta (mesmo em caso de erro)
- Botão para avançar para a próxima rodada (ou, na última rodada, para a tela de resultado final)

**Regra de pontuação (proposta inicial — ajustar se desejar outra fórmula):**
- Pontuação máxima por rodada: 1000 pontos
- Uma janela de tempo para resposta (ex.: 15 segundos a partir do fim/início da reprodução) dentro da qual a pontuação decresce linearmente até um piso mínimo (ex.: 100 pontos) conforme o tempo de resposta aumenta
- Resposta errada: 0 pontos na rodada
- Esse cálculo deve ficar isolado em um service dedicado, para facilitar ajuste futuro da fórmula

### 5. Fim de Jogo

- Total de **10 rodadas** por partida (valor configurável, não fixo no código)
- Ao final, exibir resumo: pontuação total, pontuação média por rodada, acertos x erros
- Enviar a pontuação (total ou média, a definir) para um **placar global**, com o nome/usuário do Spotify associado
- Exibir o placar global (ranking) com destaque para a posição do usuário atual

### 6. Reprodução de Áudio

A API do Spotify **descontinuou o campo `preview_url`** (trechos de 30s) para a grande maioria dos apps novos desde novembro de 2024 — hoje ele retorna `null` na maior parte dos casos. Por isso, a reprodução das músicas do jogo será feita via **Web Playback SDK do Spotify**, que toca a faixa completa dentro do navegador e permite cortar a reprodução programaticamente após 5 segundos. Isso exige:

- Conta **Spotify Premium** do usuário logado (ver seção 1 — obrigatório, verificado após o login)
- Escopos de streaming (`streaming`, `user-modify-playback-state`, etc.), já listados na seção 1
- Criação de um Web Player (dispositivo de playback) dentro da página e transferência da reprodução para esse dispositivo
- Lógica de corte: iniciar a faixa em um ponto aleatório (ou no início) e pausar/parar exatamente 5 segundos depois via `setTimeout`/temporizador sincronizado com o SDK

### 7. Estrutura de Dados (alto nível, sugestão)

- `Track`: id, nome, artista(s), capa (URL), URI/ID do Spotify
- `Playlist`: id, nome, capa, lista de `Track`
- `Round`: track sorteada, resposta do usuário, acerto (bool), tempo de resposta, pontos obtidos
- `GameSession`: playlist selecionada, lista de `Round`, pontuação total, pontuação média, timestamp

### 9. Estética Visual

Toda a identidade visual do site deve ser baseada em `resources/inspiration.webp`:

- **Traço:** ilustrações e ícones com aparência de desenho à mão/esboço (traço grosso, imperfeito, orgânico), não ícones vetoriais limpos e geométricos
- **Efeito glitch/aberração cromática:** elementos-chave (título, ícones, bordas) com contornos duplicados deslocados em vermelho e ciano sobre preto, simulando o efeito de descolamento de cor da imagem de referência
- **Paleta:** base neutra em tom cinza claro/off-white (como o fundo da referência), com preto para os traços principais e vermelho + ciano como cores de destaque/acento
- **Textura:** grão/ruído sutil sobreposto ao fundo, para reforçar a sensação analógica da referência
- **Tema:** motivos de música analógica (ondas sonoras, notas musicais, equipamentos retrô) podem aparecer como elementos decorativos recorrentes na UI

### 10. Animação de Entrada (anime.js)

- Ao carregar o site, exibir uma animação de entrada inspirada na imagem de referência, usando **anime.js**: por exemplo, o traço da ilustração (rádio + notas musicais) sendo "desenhado" progressivamente (efeito de stroke/path drawing em SVG), seguido de um pequeno "solavanco" de glitch (deslocamento rápido dos contornos vermelho/ciano) até estabilizar na posição final
- Essa animação deve rodar uma vez ao entrar no site (ex.: tela de login/splash) e não deve bloquear a interação — usuário pode pular/ela deve terminar rápido (poucos segundos)

### 11. Animação Constante de Fundo ("batida" ao ritmo)

- Efeito de fundo constante e sutil, do tipo "tremor"/glitch que pulsa como se estivesse no ritmo de uma música (ex.: pequenos deslocamentos e reforço momentâneo do efeito de aberração cromática em intervalos regulares, simulando uma batida)
- **Requisito de performance:** essa animação não pode rodar na thread principal e pesar a interação do usuário. Abordagem sugerida:
  - Usar um `<canvas>` com **OffscreenCanvas** transferido para um **Web Worker**
  - Dentro do worker, usar anime.js para animar os valores numéricos (posições, offsets, intensidade do efeito) — o worker não tem acesso ao DOM, então o anime.js deve animar objetos JS puros, e o próprio worker desenha o resultado no `OffscreenCanvas` a cada frame
  - A thread principal só recebe o canvas já renderizado, sem custo de layout/reflow
  - **Ponto de atenção:** essa arquitetura (worker + OffscreenCanvas) precisa ser validada quanto à compatibilidade de navegadores desejada, já que `OffscreenCanvas` não é suportado universalmente em navegadores mais antigos — definir um fallback simples (efeito estático ou animação leve na thread principal) para esses casos

### 12. Música de Lobby

- Tocar uma música de fundo instrumental **livre de direitos autorais** enquanto o usuário está nas telas de login/seleção de playlist/lobby (ex.: fontes como Pixabay Music, Free Music Archive, YouTube Audio Library — escolher uma faixa licenciada para uso livre/Creative Commons compatível com o projeto)
- Essa música **para automaticamente assim que uma rodada é iniciada** (ao clicar no Play para tocar o trecho da música a ser adivinhada), evitando sobreposição de áudio
- A música de lobby pode retomar após o fim da rodada/partida (ex.: nas telas de resultado ou de volta ao lobby), a confirmar

### 13. Fora de escopo nesta fase

- Modo multiplayer / partidas simultâneas entre usuários
- Persistência em backend próprio (a definir se o placar global usa apenas armazenamento local, algum BaaS, ou backend dedicado)
