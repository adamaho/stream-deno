import { Hono } from "https://deno.land/x/hono@v3.5.6/mod.ts";

const app = new Hono();

const kv = await Deno.openKv();

await kv.set(["users", "alice"], { name: "Alice" });

let count = 0;

app.get("/", () => {
  const bc = new BroadcastChannel("count");

  const body = new ReadableStream({
    start(controller) {
      bc.addEventListener("message", (event) => {
        const msg = `Hello world at: ${event.data}\n`;
        controller.enqueue(new TextEncoder().encode(msg));
      });
      const msg = `Hello world\n`;
      controller.enqueue(new TextEncoder().encode(msg));
    },
    cancel() {
      bc.close();
      console.log("closed");
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "text/plain",
      "x-content-type-options": "nosniff",
    },
  });
});

app.get("/increment", () => {
  count += 1;
  const bc = new BroadcastChannel("count");
  bc.postMessage(count);
  return new Response("dene");
});

Deno.serve(app.fetch);
