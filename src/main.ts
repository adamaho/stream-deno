import { Hono } from "https://deno.land/x/hono@v3.5.6/mod.ts";
import { createRealtime } from "./realtime.ts";

const app = new Hono();

const INITIAL_COUNT = 0;

const kv = await Deno.openKv();
await kv.set(["count"], INITIAL_COUNT);

const realtime = await createRealtime("count");

app.get("/", async (c) => {
  const countResult = await kv.get(["count"]);
  const count = countResult.value ?? INITIAL_COUNT;
  return realtime.response(c.req.raw, count);
});

app.get("/increment", async () => {
  const count = await kv.get<number>(["count"]);

  if (typeof count.value === "number") {
    const newCount = count.value + 1;
    realtime.patch(newCount);
    await kv.set(["count"], newCount);
    return new Response("dene");
  }

  return new Response("hmm... didnt work bed.");
});

Deno.serve(
  {
    port: 3000,
    // cert: Deno.readTextFileSync("./cert.pem"),
    // key: Deno.readTextFileSync("./key.pem"),
  },
  app.fetch
);
