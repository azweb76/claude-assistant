import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ZodTypeAny } from 'zod';
import { ValidationError } from './errors.js';

export function parseOrThrow<T extends ZodTypeAny>(schema: T, value: unknown): T['_output'] {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new ValidationError('Validation failed', result.error.flatten());
  }
  return result.data;
}

export function validateBody<T extends ZodTypeAny>(schema: T) {
  return async (request: FastifyRequest): Promise<void> => {
    request.body = parseOrThrow(schema, request.body);
  };
}

export function validateParams<T extends ZodTypeAny>(schema: T) {
  return async (request: FastifyRequest): Promise<void> => {
    request.params = parseOrThrow(schema, request.params);
  };
}

export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return async (request: FastifyRequest): Promise<void> => {
    request.query = parseOrThrow(schema, request.query);
  };
}

/** Unused helper kept for typed reply helpers in routes. */
export function ok<T>(reply: FastifyReply, body: T, status = 200) {
  return reply.status(status).send(body);
}
