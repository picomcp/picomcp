import { z } from "zod";
import { pico } from "../../src/index.ts";

export const server = pico({ name: "weather", version: "1.0.0" })
  .tool("forecast", {
    description: "Get the forecast for a city.",
    input: z.object({ city: z.string() }),
    output: z.object({ city: z.string(), sky: z.enum(["clear", "rain"]) }),
    run: ({ city }) => {
      console.log("this must not corrupt stdout");
      return { city, sky: "clear" as const };
    },
  })
  .resource("weather://cities/{city}", { mimeType: "text/plain", read: ({ city }) => `Lovely ${city}` })
  .prompt("plan", { args: z.object({ city: z.string() }), run: ({ city }) => `Plan a trip to ${city}` });

if (process.argv[2] === "stdio") await server.serve();
