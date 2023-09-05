import jsonpatch from "https://esm.sh/fast-json-patch@3.1.1";

type RealtimeResponse<T> = {
  data: T;
};

/**
 * Formats the data into the desired response form
 *
 * @param d Data to format
 * @returns An object of data
 */
function response(d: unknown) {
  return { data: d };
}

/**
 * Formats data as json
 *
 * @param d Data to format into json
 * @returns json
 */
function json(d: RealtimeResponse<unknown>) {
  return new TextEncoder().encode(`${JSON.stringify(d)}\n`);
}

class Realtime<RealtimeData = unknown> {
  private data: unknown;
  private topic: string;

  constructor(topic: string, initialData: unknown) {
    this.data = initialData;
    this.topic = topic;
  }

  public response = (_req: Request, initialData: unknown) => {
    const channel = new BroadcastChannel(this.topic);

    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(json(response(initialData)));

        channel.onmessage = (e) => {
          controller.enqueue(json(e.data));
        };
      },
      cancel() {
        channel.close();
      },
    });

    this.data = initialData;

    return new Response(body, {
      headers: {
        "content-type": "application/json+ndjsonpatch",
        "x-content-type-options": "nosniff",
      },
    });
  };

  public patch = (d: RealtimeData) => {
    const patch = jsonpatch.compare(response(this.data), response(d));
    const channel = new BroadcastChannel(this.topic);
    channel.postMessage(patch);
    channel.close();
    this.data = d;
  };
}

export function createRealtime(topic: string, initialData: unknown) {
  return new Realtime(topic, initialData);
}
