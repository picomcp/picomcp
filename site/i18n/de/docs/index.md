---
title: Einführung
description: Was picomcp ist, was es nicht ist, und die zehn Zeilen, die es erklären.
group: Erste Schritte
---

# Einführung

picomcp ist ein TypeScript-Framework für [Model-Context-Protocol](https://modelcontextprotocol.io)-Server. Ein MCP-Server gibt einer KI-Anwendung (Claude, Cursor, VS Code, deinem eigenen Agenten) **Tools**, die sie aufrufen kann, **Ressourcen**, die sie lesen kann, und **Prompts**, die sie dem Nutzer anbieten kann.

```ts
import { pico } from "picomcp";
import { z } from "zod";

pico({ name: "weather" })
  .tool("forecast", {
    description: "Get the forecast for a city.",
    input: z.object({ city: z.string() }),
    run: ({ city }) => getForecast(city),
  })
  .serve();
```

Das ist ein vollständiger Server. Starte ihn mit `node server.ts` und verbinde ihn mit einem beliebigen MCP-Client.

## Warum picomcp

- **Klein.** Rund 4 kB gzip-komprimiert, keine Abhängigkeiten. Die ganze Bibliothek passt in deinen Kopf und in ein Code-Review.
- **Typisiert aus deinem Schema.** Übergib ein Zod-, Valibot- oder ArkType-Schema. Dein Handler bekommt typisierte Argumente, der Client ein JSON Schema, ungültige Aufrufe eine lesbare Fehlermeldung.
- **Läuft überall.** Node 22+, Bun, Deno, Cloudflare Workers und jede Runtime mit `fetch`. Keine Node-Module im Kern.
- **Zwei Transporte, ein Server.** stdio für Desktop-Clients, Streamable HTTP für entfernte Server. Eine Option schaltet um.
- **Testbar ohne Client.** `server.call("forecast", { city: "Lyon" })` führt ein Tool im selben Prozess aus, vollständig typisiert.
- **Mit dem offiziellen SDK geprüft.** Die Testsuite steuert picomcp mit `@modelcontextprotocol/sdk` über beide Transporte.

## Was picomcp nicht ist

picomcp implementiert die Serverseite von MCP und sonst nichts. Es enthält keinen Client, keine Agenten-Schleife und kein LLM-SDK. Es konzentriert sich auf den zustandslosen Request/Response-Teil des Protokolls, den die meisten Server brauchen. Vom Server ausgehende Funktionen wie Sampling und Elicitation werden noch nicht unterstützt: Die genaue Liste steht unter [Protokollabdeckung](/docs/protocol).

## Nächste Schritte

- [Schnellstart](/docs/quickstart): in fünf Minuten einen Server bauen und verbinden.
- [Tools](/docs/tools): alles, was ein Tool kann.
- [Für KI-Agenten](/docs/agents): gib deinem Coding-Agenten die Doku mit einer einzigen URL.
