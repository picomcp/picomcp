---
title: Couverture du protocole
description: Exactement quelles parties de la spécification MCP picomcp implémente, et lesquelles pas encore.
group: Référence
---

# Couverture du protocole

picomcp vise MCP `2025-11-25` et sait négocier vers `2025-06-18`, `2025-03-26` et `2024-11-05`. Chaque fonctionnalité marquée comme prise en charge est couverte par des tests, dont des tests de bout en bout avec le client du SDK TypeScript officiel.

## Pris en charge

| Domaine | Fonctionnalité |
| --- | --- |
| Cycle de vie | `initialize` avec négociation de version, `notifications/initialized`, `ping` |
| Outils | `tools/list`, `tools/call`, validation de l’entrée, `outputSchema` et `structuredContent`, annotations, titres |
| Contenu | texte, image, audio, liens de ressources, ressources intégrées |
| Ressources | `resources/list`, `resources/templates/list`, `resources/read`, contenus texte et binaires |
| Prompts | `prompts/list`, `prompts/get`, arguments déduits des schémas |
| Utilitaires | `notifications/cancelled` avec `AbortSignal` |
| JSON-RPC | Lots, codes d’erreur, réponses du client ignorées |
| stdio | JSON délimité par des retours à la ligne, stdout protégé des logs égarés |
| Streamable HTTP | Réponses JSON sans état, `202` pour les notifications, `405` pour `GET`, CORS, vérification de `Origin` et de `MCP-Protocol-Version` |

## Pas encore pris en charge

| Fonctionnalité | Pourquoi |
| --- | --- |
| Sampling, elicitation, roots | Ils exigent que le serveur envoie des requêtes au client. La conception sans état de picomcp ne garde pas encore de canal ouvert pour cela. |
| Notifications de log, de progression et `list_changed` | Même raison : des messages du serveur vers le client. |
| Abonnements aux ressources | Même raison. |
| Complétions | Prévu. |
| Curseurs de pagination | Les listes sont renvoyées en entier, ce qui convient aux serveurs qui ont jusqu’à quelques centaines d’entrées. |
| Sessions (`Mcp-Session-Id`) et flux SSE | Inutiles en mode sans état. |
| Tasks | Expérimental dans la spécification. |

Vous avez besoin de l’une d’elles ? [Ouvrez une issue](https://github.com/picomcp/picomcp/issues) et décrivez votre cas d’usage. Les fonctionnalités arrivent quand on peut les ajouter sans alourdir picomcp.
