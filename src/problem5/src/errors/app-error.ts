/**
 * Custom application error class that encapsulates HTTP status codes and operational flags.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code: string;

  /**
   * Creates an instance of AppError.
   * @param statusCode - HTTP status code
   * @param message - Error message
   * @param code - Application-specific error code string (e.g., 'NOT_FOUND')
   * @param isOperational - True if the error is a trusted operational error, false if it's a programming error
   */
  constructor(statusCode: number, message: string, code: string = 'INTERNAL_ERROR', isOperational: boolean = true) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);

    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}
