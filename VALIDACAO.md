# Validação da primeira versão

Data: 14/09/2026.

## Verificado

- 14 testes automatizados: prazo após suspensão, pausa/continuação, substituição rápida, restauração, validação e formatação de duração, sinal incorporado no áudio; vetor oficial RFC 8291, descriptografia e rejeição de adulteração, assinatura VAPID, bloqueio de destinos arbitrários, autenticação/cancelamento/remoção/limites de agendamento.
- `npm run lint` e `npm run build`: sintaxe de todos os módulos do app e Worker, manifesto e arquivos locais.
- Chrome real no computador: início imediato, pausa, continuação, troca de duração, tempo personalizado de 1 segundo e estado de conclusão; reprodução, pausa e continuação do modo áudio; configuração recolhida e mensagens de instalação.
- Cache offline: servidor local desligado, página recarregada e timer de 60 segundos iniciado/pausado com sucesso.
- Inspeção visual em 320×640, 390×844, 768×1024, 1366×768 e 1920×1080, no tema escuro do sistema. Sem overflow horizontal observado. Os botões fixos mediram cerca de 61 pixels no menor viewport.
- Console do app sem erros observados. Foram vistos avisos de extensão do navegador, identificados por origem `chrome-extension://`, sem relação com o código do timer.
- 54.878 bytes de arquivos estáticos antes dos últimos ajustes pequenos, sem compressão. Nenhuma fonte ou biblioteca externa no carregamento inicial. Não equivale a uma medição de Core Web Vitals.

## Ainda depende de validação

- Safari no iPhone e Chrome no Android físicos; instalação real e funcionamento com tela bloqueada.
- Comportamento em chamadas, Foco, economia de bateria, Bluetooth e reprodução simultânea com música. Áudio de bolso é experimental.
- VoiceOver/TalkBack, zoom a 200%, modo claro e preferência de movimento reduzido no sistema. A implementação inclui controles nativos, foco visível, labels, anúncios só de estado e alternativa sem interpolação contínua do arco; isso não comprova conformidade completa WCAG.
- Cloudflare: ambiente real ainda não criado/conectado. Worker foi preparado e validado por testes locais com armazenamento simulado; faltam implantação, integração com os provedores de Web Push e medição de latência de entrega.
- Não houve teste invasivo, coleta de dados de usuários nem cobrança.

## Decisões

1. Manter os quatro atalhos e arco aprovados. Critério: iniciar descanso com um toque.
2. Site estático no GitHub Pages pela restrição de custo zero. Rever somente se os limites do site/plataforma impedirem uso real.
3. Oferecer áudio opcional com tiques audíveis e sinal final numa faixa finita, sem loop silencioso para manter o navegador ativo. Rever se testes em aparelhos não forem confiáveis.
4. Preparar Cloudflare Free com SQLite Durable Objects para push e impedir implantação ativa antes dos segredos/configuração. Rever com base na entrega real, consumo de cotas e cadastro do proprietário.

## Atualização HIIT — 14/09/2026

- 24 testes automatizados passaram (14 existentes + 10 novos): fases e limites, suspensão, pausa no descanso, retomada, ausência de descanso final, voz em etapas curtas e PCM com sinal final embutido. Build valida todos os HTMLs e arquivos do cache offline.
- Chrome: sequência 2 × 10 s + 5 s chegou a Concluído / Série 2 de 2; sequência com etapas de 1 s e descanso de 15 s exibiu descanso em verde e concluiu sem pausa extra. Voz e bolso foram ativados pelos controles.
- Pausa com 01:21 restantes, recarga e continuação conservaram a posição. Encerrar libera a configuração. Timer rápido de 10 s inicia por um toque e conclui.
- Layout inspecionado em 320 px, 390 px e desktop: sem rolagem horizontal (320 px de conteúdo para 320 px de viewport), ação principal de 52 px. A distinção de fase usa texto além de cor. Preferência de movimento reduzido mantém o arco em passos por segundo.
- O usuário confirmou som/avisos no aparelho bloqueado na versão anterior. Não foi feita ainda validação do HIIT em iPhone/Android reais bloqueados, nem avaliação auditiva pelo agente. Testar voz, última troca, pausas por chamadas, fones/música e volume no aparelho antes de considerar esses casos confirmados.
- Nenhuma dependência npm de produção adicionada. O site inclui aproximadamente 51 KB de amostras de voz em base64. Ferramentas Python de conversão ficam apenas na pasta ignorada work; fontes e licença estão nos créditos.
- Offline confirmado: servidor local desligado, página HIIT recarregada do cache e treino de 6 s com voz e bolso ativados executado até Concluído.
