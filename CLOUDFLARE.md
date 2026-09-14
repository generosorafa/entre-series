# Avisos no bolso — configuração gratuita

O site já funciona sem conta na Cloudflare. Este serviço opcional agenda Web Push em um Durable Object SQLite. Foi preparado e testado com simulações locais; a implantação real e a entrega num iPhone continuam pendentes.

## Para você fazer

1. Abra https://dash.cloudflare.com/sign-up e crie sua conta. Confirme o e-mail.
2. Use o plano **Workers Free**. Não contrate Workers Paid e não habilite cobrança. Não precisa comprar domínio, transferir DNS ou cadastrar o site como domínio.
3. Volte à conversa e diga que a conta está pronta. Vamos conectar a conta por autorização oficial, sem compartilhar senha ou token na conversa, e concluir a implantação.

No Free, limites excedidos geram falhas, sem cobrança de excedente. A disponibilidade e as cotas precisam ser reconfirmadas antes da implantação: https://developers.cloudflare.com/durable-objects/platform/pricing/ . Em 14/09/2026: 100 mil requisições/dia para Durable Objects e 100 mil linhas escritas/dia; chamadas ao Worker também têm cota. Isso não equivale a 100 mil timers. Não mudar para Paid para contornar limites.

## Procedimento técnico para concluir depois do cadastro

Não execute estes passos sem conta autorizada e sem confirmar Workers Free. O Wrangler, CLI oficial da Cloudflare, será necessário para login, segredos e publicação. Ele não foi instalado nesta entrega. Sua instalação/execução deve ser autorizada antes, conforme preferência do proprietário.

1. Autenticar o Wrangler pela janela oficial de login (`wrangler login`).
2. Executar `node scripts/generate-push-secrets.mjs` na raiz. Ele cria um arquivo local ignorado, sem imprimir os valores. Gerar apenas uma vez; a chave pública deve permanecer estável para as inscrições.
3. Implantar `worker/wrangler.jsonc` com `ENABLED=false` para provisionar o serviço pausado: `wrangler deploy --config worker/wrangler.jsonc`.
4. Carregar os três valores com `wrangler secret bulk work/push-secrets-private.json --config worker/wrangler.jsonc`. Nunca colocar segredos em `public/`, commits, prints ou logs.
5. Alterar `ENABLED` para `true`, reimplantar e confirmar `/public-key` usando o Origin permitido.
6. Definir apenas a URL pública HTTPS do Worker em `public/config.js` (`PUSH_SERVER`), aumentar a versão do cache em `public/sw.js` e publicar o GitHub Pages. Atualizar `privacy.html` para informar que os avisos remotos estão ativos.
7. Abrir a instalação no iPhone (iOS 16.4+), autorizar avisos por toque, iniciar 10 segundos, aguardar a confirmação de agendamento e bloquear. Repetir com 30/60/90, pausa, troca de tempo, sem internet, Foco, fones e música. Não prometer entrega exata: push exige rede e respeita preferências do sistema.
8. Confirmar exclusão da inscrição ao desativar e limites de abuso. Testar a implantação real com uma inscrição de cada provedor alvo, pois os testes locais não comprovam aceitação do push por Apple/Google.

## Segurança e operação

- CORS restrito ao domínio GitHub Pages; CORS não substitui autenticação.
- Token aleatório de 256 bits por instalação, guardado como hash no servidor. Cada alteração exige esse token.
- Um agendamento por inscrição; versões rejeitam operações antigas. Prazo máximo de 10 minutos.
- Limite por IP derivado via HMAC com segredo; até 30 inscrições e 1.000 operações por hora. Expira em uma hora; não persistimos IP bruto no banco do app.
- Destinos de push restritos a provedores conhecidos; HTTPS, sem redirecionamento. Conteúdo fixo, sem campos de mensagem fornecidos pelo visitante.
- Inscrições inativas expiram em 24h; dados apagados por alarme. Limites/indisponibilidade podem adiar limpeza. Sem logs de conteúdo/inscrições no app; provedores têm sua própria operação técnica.
- Avisos expiram em 30 segundos. Até duas retentativas limitadas; tag/topic reduzem duplicatas, mas push/alarms têm entrega pelo menos uma vez e não garantem ausência de duplicatas.
- Uma entrega já em trânsito não pode ser cancelada. Pausa offline mostra aviso de que o cancelamento não foi confirmado.
- Pausar o serviço: definir `ENABLED=false` e reimplantar. O timer local continua funcionando. Voltar o front para `PUSH_SERVER=''` se necessário.
- Se a versão do Worker falhar, fazer rollback pelo painel da Cloudflare ou reimplantar o commit anterior. Não apagar namespace com inscrições ativas sem orientação.

## Fontes

- https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- https://developers.cloudflare.com/durable-objects/api/alarms/
- https://developers.cloudflare.com/durable-objects/platform/pricing/
- https://datatracker.ietf.org/doc/html/rfc8291
- https://datatracker.ietf.org/doc/html/rfc8292
