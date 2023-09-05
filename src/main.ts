import { Hono } from "https://deno.land/x/hono@v3.5.6/mod.ts";
import { createRealtime } from "./realtime.ts";

const app = new Hono();

const INITIAL_COUNT = 0;

const kv = await Deno.openKv();
await kv.set(["count"], INITIAL_COUNT);

const realtime = createRealtime("count", INITIAL_COUNT);

app.get("/", async (c) => {
  const count = await kv.get(["count"]);
  return realtime.response(c.req.raw, count.value ?? INITIAL_COUNT);
});

app.get("/increment", async () => {
  const count = await kv.get<number>(["count"]);

  if (typeof count.value === "number") {
    const newCount = count.value + 1;
    await kv.set(["count"], newCount);
    realtime.patch(newCount);
    return new Response("dene");
  }

  return new Response("hmm... didnt work bed.");
});

Deno.serve(
  {
    port: 3000,
    cert: Deno.readTextFileSync("./cert.pem"),
    key: Deno.readTextFileSync("./key.pem"),
  },
  app.fetch
);
