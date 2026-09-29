import { EventEmitter } from 'node:events';

/*
  In-process realtime bus for SSE endpoints (GET /messages/stream,
  GET /admin/events/stream). No websocket dependency: the frontends read a
  fetch-based ReadableStream, so the server only needs res.write().

  Topics:
    user:<id>        — one learner/admin session
    admin            — every admin console
    classroom:<id>   — members of one classroom

  emit() never throws: realtime delivery must not break a DB write.
*/

const bus = new EventEmitter();
bus.setMaxListeners(0); // rooms can have many concurrent readers

export type BusListener = (event: string, data: any) => void;

export function subscribe(topic: string, fn: BusListener): () => void {
  bus.on(topic, fn);
  return () => bus.off(topic, fn);
}

export function emit(topic: string, event: string, data: any): void {
  try {
    bus.emit(topic, event, data);
  } catch {
    /* listener errors must never propagate into request handlers */
  }
}
