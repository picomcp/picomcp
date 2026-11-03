/**
 * A complete stdio server: one tool, one resource template, one prompt.
 *
 *   node examples/weather.ts
 *   claude mcp add weather -- node /absolute/path/to/examples/weather.ts
 */
import { z } from "zod";
import { pico } from "picomcp";

const SKIES = ["clear", "cloudy", "rain", "snow"] as const;

const server = pico({
  name: "weather",
  version: "1.0.0",
  instructions: "Use `forecast` for any question about upcoming weather.",
})
  .tool("forecast", {
    title: "Weather forecast",
    description: "Daily forecast for a city.",
    input: z.object({
      city: z.string().describe("City name, e.g. Lyon"),
      days: z.number().int().min(1).max(7).default(3).describe("How many days"),
    }),
    output: z.object({
      city: z.string(),
      days: z.array(z.object({ date: z.string(), sky: z.enum(SKIES), high: z.number() })),
    }),
    annotations: { readOnlyHint: true, openWorldHint: true },
    run: async ({ city, days }) => ({
      city,
      days: Array.from({ length: days }, (_, i) => ({
        date: new Date(Date.now() + i * 86_400_000).toISOString().slice(0, 10),
        sky: SKIES[(city.length + i) % SKIES.length]!,
        high: 12 + ((city.length * 7 + i * 3) % 15),
      })),
    }),
  })
  .resource("weather://stations/{city}", {
    description: "Raw station metadata for a city.",
    read: ({ city }) => ({ city, station: `${city.toUpperCase().slice(0, 3)}-01`, elevation: 175 }),
  })
  .prompt("packing-list", {
    description: "Ask for a packing list that fits the forecast.",
    args: z.object({ city: z.string().describe("Destination") }),
    run: ({ city }) => `Check the forecast for ${city}, then write a short packing list for the trip.`,
  });

await server.serve();
