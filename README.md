# ENTRE SÉRIES

Timer gratuito para o descanso entre séries: quatro atalhos de 10, 30, 60 e 90 segundos iniciam com um toque. Personalização de 1 a 600 segundos, pausa, repetição, som, arco regressivo, instalação e cache offline. Sem login, anúncios ou dependências de produção.

## Executar e verificar

Node.js 22 ou mais recente, sem `npm install`:

```sh
npm run dev
npm test
npm run lint
npm run build
```

Abra http://127.0.0.1:4173/ . O build faz verificações de sintaxe, manifesto e referências; o site é estático e o diretório publicado é `public/`.

## Arquitetura e escolhas

- HTML semântico, CSS, JavaScript nativo e SVG para o único arco. Fontes do sistema e ícones locais, sem chamadas a CDNs.
- Tela aberta: prazo absoluto; recalcula ao retornar de suspensão. `requestAnimationFrame` apenas enquanto visível, sem acumular intervalos. `prefers-reduced-motion` atualiza o arco por segundo.
- Áudio no bolso: faixa WAV finita, gerada no aparelho, contendo tiques e sinal final. A contagem acompanha a posição real da mídia e pausa quando ela é interrompida. A faixa não depende de um callback JavaScript para produzir o sinal final. Retomar após recarregar exige toque, sem autoplay oculto.
- Media Session fornece metadados e pausa/continuação onde suportado. Não equivale a Live Activity/AlarmKit nem garante Dynamic Island. Pode interromper Spotify e outros áudios.
- Screen Wake Lock enquanto ativo, sujeito à disponibilidade/permissão do navegador.
- Preferências/estado local. Nenhuma informação de saúde, conta ou analytics.
- Service worker com cache de versão e manifest com escopo relativo, compatível com `/xamai-3s/` no GitHub Pages.
- Worker opcional com agendamento Web Push, desativado por padrão e separado de `public/`. Guia: [CLOUDFLARE.md](CLOUDFLARE.md).

## Publicação gratuita

Repositório público e GitHub Pages por Actions. `.github/workflows/pages.yml` testa, verifica e publica somente `public/`. Backend, testes e documentação não são servidos no Pages. Os arquivos de código são públicos. O projeto não contém credenciais ou arquivos do usuário.

Após mudar um arquivo do app, incrementar `CACHE` em `public/sw.js`. O service worker novo aguarda as janelas antigas fecharem para evitar misturar versões durante a contagem. Para rollback, reverter o commit, incrementar CACHE e publicar novamente. O Git funciona como histórico/backup do código; não há banco de usuários na primeira versão.

## Critérios e limites

- Orçamento inicial: menos de 100 KB de JavaScript sem compressão, menos de 200 KB de arquivos estáticos totais, nenhuma dependência externa. Áudio de bolso é gerado sob demanda e não entra no download inicial.
- Funcionalidade: os quatro atalhos iniciam, pausa preserva saldo, repetição reinicia, personalização valida limites, voltar de suspensão não prolonga a contagem de tela.
- Sem promessa de despertador confiável com tela bloqueada. Chamadas, modo Foco, volume, fones, bateria e suspensão podem interromper/silenciar. Testar num iPhone e Android reais antes de depender do modo bolso.
- Worker preparado com testes locais; falta implantação e validação de entrega com provedores reais depois do cadastro Cloudflare Free. O serviço deve permanecer pausado até configurar os segredos.
- Cache offline e notificações precisam de HTTPS ou localhost. A prévia intermediada do navegador integrado pode não executar os arquivos; usar um navegador real no endereço HTTP/HTTPS.
- Leitor de tela anuncia estados, não cada segundo. Ainda exige validação manual com VoiceOver/TalkBack em aparelho real.

## Próximo lote

Configurar Cloudflare Free com conta do proprietário, publicar o Worker e testar notificações no iPhone instalado. Observar uso em treinos: toque até início, facilidade de leitura e conclusão percebida. Somente depois decidir se há necessidade de recursos nativos.
