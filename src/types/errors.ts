export class NotFoundError extends Error {
  name = "NotFoundError";
  constructor(message: string) {
    super(message);
  }
}

export class BadRequestError extends Error {
  name = "BadRequestError";
  constructor(message: string) {
    super(message);
  }
}

export class UnauthorizedError extends Error {
  name = "UnauthorizedError";
  constructor(message: string) {
    super(message);
  }
}

export class InternalServerError extends Error {
  name = "InternalServerError";
  constructor(message: string) {
    super(message);
  }
}