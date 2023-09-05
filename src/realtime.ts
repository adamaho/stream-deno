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
  private kv: Deno.Kv;
  private topic: string;

  constructor(topic: string, kv: Deno.Kv) {
    this.kv = kv;
    this.topic = topic;
  }

  private setData = async (d: unknown) => {
    await this.kv.set([this.topic, "prev"], d);
  };

  private getData = async () => {
    return await this.kv.get([this.topic, "prev"]);
  };

  public response = async (_req: Request, initialData: unknown) => {
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

    await this.setData(initialData);

    return new Response(body, {
      headers: {
        "content-type": "application/json+ndjsonpatch",
        "x-content-type-options": "nosniff",
      },
    });
  };

  public patch = async (d: RealtimeData) => {
    const prev = await this.getData();

    if (!(typeof prev.value === "number")) {
      return;
    }

    const patch = jsonpatch.compare(response(prev.value), response(d));
    const channel = new BroadcastChannel(this.topic);
    channel.postMessage(patch);
    try {
      await this.setData(d);
    } catch (err) {
      console.log(err);
    }
  };
}

export async function createRealtime(topic: string, initialData: unknown) {
  try {
    const kv = await Deno.openKv();
    await kv.set([topic, "prev"], initialData);
    return new Realtime(topic, kv);
  } catch (err) {
    console.log(err);
  }
}
