# bruma. — cortes que se espalham

Sobe a gameplay (arquivo ou link) e recebe 3 cortes verticais 9:16 legendados para TikTok, Reels e Shorts. Revisa e baixa.

## Rodar

```bash
npm install
npm run dev        # http://localhost:5173
```

Build de produção: `npm run build` (gera `dist/`).

## O que tem

| Rota | Tela |
| --- | --- |
| `/` | Landing page: hero com blob 3D (three.js), demo interativa em Remotion (legenda, cor e formato mudam ao vivo), "como funciona" com animação Remotion guiada pelo scroll, cards A/B/C do PS5, fitas 3D, FAQ |
| `/entrar` | Entrada sem senha (nome + WhatsApp/@). Fica salvo no navegador |
| `/app` | Meus cortes (projetos salvos no IndexedDB) |
| `/app/novo` | Upload (arrastar/soltar) ou link da live, duração do corte, formato e cor |
| `/app/p/:id` | Processamento com progresso → timeline de energia → 3 cortes com preview Remotion, edição de legenda palavra por palavra, ajuste de início/duração, formato, foco, cor, posição, `.srt`, download MP4 1080×1920 |

## Como funciona o motor (tudo no navegador)

1. **Lê o vídeo** com [Mediabunny](https://mediabunny.dev) (MP4, MOV, WebM, MKV).
2. **Acha os 3 momentos**: envelope de energia do áudio a cada 0,5 s; picos sustentados viram janelas sem sobreposição, com o pico nos primeiros 30% do corte (gancho). `src/lib/analyze.ts`
3. **Legenda**: Whisper (`onnx-community/whisper-base_timestamped`, cai para o `tiny`) via transformers.js num Web Worker, WebGPU quando disponível, com tempo por palavra. O modelo (~80 MB) baixa do Hugging Face na primeira vez e fica em cache. Se falhar, o usuário escreve a legenda e ela é distribuída no corte. `src/lib/whisper.worker.ts`
4. **Preview**: Remotion Player com a mesma geometria do arquivo final. `src/remotion/CutPreview.tsx`
5. **Exporta**: Mediabunny + WebCodecs, desenhando cada frame num canvas (fundo desfocado ou tela cheia + legenda + marca). H.264/MP4 quando o navegador suporta, senão WebM. `src/lib/render.ts`

O arquivo do usuário **não sobe para nenhum servidor**.

## Link da live (YouTube/Twitch/Kick)

- **Hospedagem estática (Netlify)**: o link vira um pedido para a equipe via Netlify Forms (formulário `pedido-link`, aparece no painel do Netlify) e o projeto fica "Link com a equipe". Quando tiver o arquivo, sobe na mesma tela.
- **Servidor próprio**: `npm run build && npm run server` sobe `server/link-server.mjs` (porta 8787), que serve o site e baixa o link com `yt-dlp` sozinho. Precisa de `yt-dlp` e `ffmpeg` instalados. Em dev, o Vite já faz proxy de `/api` para a 8787.

## Deploy

Netlify: conectar o repositório; `netlify.toml` já tem build, pasta `dist` e redirect de SPA.

## Marca

Logo B (pixel), recolorido no gradiente azul `#5B7CFF` → roxo `#A855F7` → magenta `#E040FB`, ponto em rosa `#FF2E7E`, fundo `#07060B`. Títulos em Unbounded, texto em Inter.

## Limites conhecidos

- Gerar o arquivo final precisa de Chrome/Edge atualizados (WebCodecs). Safari/Firefox podem ficar só no preview.
- Navegadores sem codificador AAC exportam o áudio em Opus.
- Lives de várias horas: a análise do áudio é rápida, mas o arquivo inteiro fica guardado no IndexedDB do navegador.
- A legenda automática erra mais com gíria e muito barulho de jogo, por isso a revisão palavra por palavra.
