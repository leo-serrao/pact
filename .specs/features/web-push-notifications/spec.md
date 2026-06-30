# Web Push Notifications Specification

## Problem Statement

O Pact tem um sistema de notificações in-app (tabela `notifications` no Supabase + realtime), mas o usuário só vê uma notificação se tiver o app aberto. Como o Pact é um PWA instalado na tela inicial do celular, queremos aproveitar o suporte nativo de Web Push (Android Chrome e iOS Safari 16.4+ em PWA instalado) para entregar notificações reais do sistema operacional mesmo com o app fechado — aumentando o engajamento em eventos como despesa compartilhada nova, dívida quitada e parceiro que entrou na parceria.

## Goals

- [ ] Usuário recebe uma notificação push do SO quando uma notificação é criada no sistema atual (insert em `notifications`), mesmo com o app fechado.
- [ ] Funciona em Android Chrome (qualquer contexto) e iOS Safari (apenas PWA instalado via "Adicionar à Tela de Início", iOS 16.4+).
- [ ] Clicar na notificação push abre o app já navegado para a tela relevante (deep-link).
- [ ] Suporta múltiplos dispositivos por usuário e remove subscriptions inválidas automaticamente.

## Out of Scope

| Feature | Reason |
|---|---|
| Preferências de notificação por tipo (opt-in/out granular) | Decidido com o usuário: fica para P2/P3, fora do MVP |
| Notificações push para web desktop não-PWA (sem manifest instalado) | Foco do produto é mobile PWA; desktop pode herdar o mesmo mecanismo depois sem mudança de arquitetura |
| Rich push (imagens, action buttons múltiplos, agrupamento por thread) | Não pedido; pode ser adicionado depois sem quebrar o contrato de payload |
| Envio de push fora do fluxo de `notifications` (ex: campanhas/marketing) | Fora do escopo deste fluxo; reaproveitaria a mesma infraestrutura mas é outra feature |

---

## User Stories

### P1: Receber push real ao gerar notificação ⭐ MVP

**User Story**: Como usuário do Pact com o app instalado no celular, quero receber uma notificação push do sistema quando algo relevante acontecer (despesa compartilhada, dívida quitada, parceiro entrou), mesmo com o app fechado, para não precisar abrir o app para descobrir.

**Why P1**: É o core da feature — sem isso não há push real, só o sino in-app que já existe.

**Acceptance Criteria**:

1. WHEN o usuário concede permissão de notificação E o navegador/SO suporta Web Push THEN o sistema SHALL registrar uma subscription (endpoint + chaves) vinculada ao `user_id` e ao dispositivo.
2. WHEN uma linha é inserida em `notifications` para um `user_id` THEN o sistema SHALL enviar um push real para todas as subscriptions ativas daquele usuário, com `title`/`body` derivados da notificação.
3. WHEN o app está fechado ou em background E o push chega THEN o SO SHALL exibir a notificação nativa (ícone do Pact, título, corpo).
4. WHEN o usuário clica na notificação push THEN o app SHALL abrir (ou focar janela existente) navegado para a rota relacionada ao tipo/dado da notificação (deep-link).
5. WHEN o navegador não suporta Web Push (ex: iOS Safari fora de PWA instalada) THEN o sistema SHALL falhar silenciosamente na UI (sem quebrar o fluxo in-app existente) e não tentar registrar subscription.

**Independent Test**: Instalar o PWA no Android, conceder permissão, gerar uma despesa compartilhada em outra sessão/usuário, fechar o app e confirmar que a notificação do SO aparece e, ao clicar, abre na tela da despesa.

---

### P1: Solicitar permissão de forma não-intrusiva

**User Story**: Como usuário, quero ser perguntado sobre notificações push em um momento sensato (não no primeiro segundo de uso), e poder ativar manualmente depois se eu recusar ou ignorar.

**Why P1**: Pedir permissão sem contexto tem alta taxa de rejeição irreversível no navegador; precisa fazer parte do MVP para a feature ser usável de verdade.

**Acceptance Criteria**:

1. WHEN o usuário usa o app pela primeira vez após login (não no primeiro paint) THEN o sistema SHALL oferecer um prompt próprio explicando o pedido antes de chamar a API nativa `Notification.requestPermission()`.
2. WHEN o usuário nega a permissão nativa do navegador THEN o sistema SHALL parar de pedir automaticamente e mostrar uma opção manual em `Settings` para tentar novamente (já que o navegador não deixa re-perguntar via JS).
3. WHEN o usuário está em iOS Safari fora do modo PWA instalado THEN o sistema SHALL mostrar uma instrução ("Adicione à Tela de Início para ativar notificações") em vez do prompt de permissão.
4. WHEN a permissão já foi concedida anteriormente neste dispositivo THEN o sistema SHALL apenas garantir que a subscription existe (idempotente), sem novo prompt.

**Independent Test**: Limpar permissões do site, abrir o app, navegar até o ponto do prompt, conceder, verificar em `push_subscriptions` que uma linha foi criada para o `user_id` + endpoint do dispositivo.

---

### P2: Múltiplos dispositivos e limpeza de subscriptions inválidas

**User Story**: Como usuário que usa o Pact no celular Android e no iPhone, quero receber push em ambos, e como sistema, não quero continuar tentando enviar para dispositivos que desinstalaram o app ou revogaram a permissão.

**Why P2**: Importante para confiabilidade e custo (evitar erros acumulados), mas o P1 já funciona com um único dispositivo — isso é hardening.

**Acceptance Criteria**:

1. WHEN o mesmo usuário tem subscriptions ativas em 2+ dispositivos THEN o sistema SHALL enviar o push para todos eles no mesmo evento.
2. WHEN o push service responde 404/410 para um endpoint THEN o sistema SHALL remover essa subscription de `push_subscriptions`.
3. WHEN o usuário reinstala o PWA ou limpa dados do navegador THEN uma nova subscription SHALL substituir (ou conviver com) a antiga sem duplicar entradas para o mesmo endpoint.

**Independent Test**: Registrar subscription, alterar o endpoint salvo no banco para um valor inválido, disparar uma notificação e confirmar que a linha correspondente é removida após o envio falhar com 404/410.

---

## Edge Cases

- WHEN o usuário revoga a permissão de notificação depois de já ter subscription ativa THEN o próximo envio de push SHALL falhar (410/403) e o sistema SHALL remover a subscription correspondente, sem quebrar o envio para outras subscriptions do mesmo usuário.
- WHEN a tabela `notifications` recebe um insert em lote (ex: múltiplos usuários de uma vez) THEN cada push SHALL ser processado independentemente — falha em um usuário não bloqueia os demais.
- WHEN o usuário não está autenticado (subscription órfã) THEN o sistema SHALL nunca persistir uma subscription sem `user_id` válido (RLS).
- WHEN o `data` da notificação não contém informação suficiente para deep-link (ex: tipo desconhecido) THEN o clique SHALL cair em um fallback (abrir a home) em vez de quebrar.
- WHEN o Service Worker está sendo atualizado/instalado no momento em que um push chega THEN o evento `push` SHALL ainda ser tratado (usar `event.waitUntil`, sem depender de UI já carregada).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| PUSH-01 | P1: Receber push real | Design | Pending |
| PUSH-02 | P1: Receber push real | Design | Pending |
| PUSH-03 | P1: Receber push real | Design | Pending |
| PUSH-04 | P1: Receber push real (deep-link) | Design | Pending |
| PUSH-05 | P1: Receber push real (fallback sem suporte) | Design | Pending |
| PUSH-06 | P1: Permissão não-intrusiva | Design | Pending |
| PUSH-07 | P1: Permissão não-intrusiva (negada) | Design | Pending |
| PUSH-08 | P1: Permissão não-intrusiva (iOS fora de PWA) | Design | Pending |
| PUSH-09 | P1: Permissão não-intrusiva (idempotente) | Design | Pending |
| PUSH-10 | P2: Multi-dispositivo | Design | Pending |
| PUSH-11 | P2: Limpeza 404/410 | Design | Pending |
| PUSH-12 | P2: Sem duplicar subscription | Design | Pending |

**ID format:** `PUSH-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 12 total, 0 mapped to tasks yet, 12 unmapped ⚠️ (mapeamento ocorre na fase Design/Tasks)

---

## Success Criteria

- [ ] Em um Android com o PWA instalado, fechar o app e ainda assim ver a notificação do SO em até alguns segundos após o insert em `notifications`.
- [ ] Em um iPhone com o PWA instalado (iOS 16.4+) via "Adicionar à Tela de Início", o mesmo fluxo funciona.
- [ ] Clicar na notificação push leva à tela correta (grupo compartilhado / saldo) e não apenas à home, para os 3 tipos existentes.
- [ ] Subscriptions inválidas somem da tabela sem intervenção manual após uma tentativa de envio falha.
- [ ] Nenhuma regressão no fluxo in-app existente (sino, painel, marcar como lida, etc.).

## Decisões já tomadas com o usuário

- Clique na notificação faz **deep-link** para a rota relacionada ao tipo (não apenas abre a home).
- Todos os 3 tipos existentes entram no push do P1; preferências por tipo ficam fora do MVP.
- A tabela `push_subscriptions` e a Edge Function serão aplicadas via Supabase MCP durante a fase Execute (sem pasta `supabase/` local versionada hoje — `notifications` já é populada por lógica 100% server-side/dashboard, não há `.insert` no client).
