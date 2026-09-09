export type ErrorCode =
  'NOT_FOUND' | 'VALIDATION_ERROR' | 'CONFLICT' | 'EXTERNAL_COMMAND_ERROR' | 'INTERNAL_ERROR';

export type ErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
  };
};

export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly details?: unknown;

  constructor(statusCode: number, code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }

  toBody(): ErrorBody {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details !== undefined ? { details: this.details } : {}),
      },
    };
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not found', details?: unknown) {
    super(404, 'NOT_FOUND', message, details);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(400, 'VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict', details?: unknown) {
    super(409, 'CONFLICT', message, details);
    this.name = 'ConflictError';
  }
}

export class ExternalCommandError extends AppError {
  constructor(message = 'External command failed', details?: unknown) {
    super(502, 'EXTERNAL_COMMAND_ERROR', message, details);
    this.name = 'ExternalCommandError';
  }
}
