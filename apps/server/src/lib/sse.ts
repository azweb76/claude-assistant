import type { FastifyReply, FastifyRequest } from 'fastify';
import type { StreamEvent } from '@claude-assistant/shared';

export type SseController = {
  send: (event: StreamEvent) => void;
  close: () => void;
  isClosed: () => boolean;
};

export type OpenSseOptions = {
  heartbeatMs?: number;
};

export function openSse(
  request: FastifyRequest,
  reply: FastifyReply,
  options: OpenSseOptions = {},
): SseController {
  let closed = false;
  const heartbeatMs = options.heartbeatMs ?? 15_000;
  reply.hijack();
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  reply.raw.write(': connected\n\n');

  const send = (event: StreamEvent) => {
    if (closed) {
      return;
    }
    reply.raw.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
  };

  const close = () => {
    if (closed) {
      return;
    }
    closed = true;
    clearInterval(heartbeat);
    request.raw.off('close', onClose);
    try {
      reply.raw.end();
    } catch {
      // already closed
    }
  };

  const onClose = () => {
    close();
  };

  request.raw.on('close', onClose);

  const heartbeat = setInterval(() => {
    send({ type: 'heartbeat', data: { at: new Date().toISOString() } });
  }, heartbeatMs);
  heartbeat.unref?.();

  return {
    send,
    close,
    isClosed: () => closed,
  };
}

export async function streamAsyncIterable(
  controller: SseController,
  events: AsyncIterable<StreamEvent>,
): Promise<void> {
  try {
    for await (const event of events) {
      if (controller.isClosed()) {
        break;
      }
      controller.send(event);
    }
  } finally {
    controller.close();
  }
}
