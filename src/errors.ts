export class BVError extends Error {
  readonly source: string;

  constructor(message: string, source: string) {
    super(message);
    this.name = "BVError";
    this.source = source;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BVHttpError extends BVError {
  readonly statusCode: number;
  readonly responseBody: string;

  constructor(statusCode: number, responseBody: string, source: string) {
    super(`HTTP ${statusCode}: ${responseBody}`, source);
    this.name = "BVHttpError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BVTimeoutError extends BVError {
  readonly timeoutMs: number;

  constructor(timeoutMs: number, source: string) {
    super(`Request timed out after ${timeoutMs}ms`, source);
    this.name = "BVTimeoutError";
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class BVValidationError extends BVError {
  readonly field: string;
  readonly constraint: string;

  constructor(field: string, constraint: string, source: string) {
    super(`Validation failed for "${field}": ${constraint}`, source);
    this.name = "BVValidationError";
    this.field = field;
    this.constraint = constraint;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
