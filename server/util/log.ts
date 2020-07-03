import Transport = require('winston-transport');
import Winston = require('winston');
import ExpressWinston = require('express-winston');
import Sentry = require('@sentry/node');
import Express = require('express');

enum LogLevel {
  Verbose = 'verbose',
  Info = 'info',
  Warn = 'warn',
  Error = 'error',
}

let consoleTransport: Winston.transports.ConsoleTransportInstance;
let transports: Transport[];
let logger: Winston.Logger;

/**
 * Helper constant to produce a readable output
 * for winston console logs.
 */
const readableFormat = Winston.format.printf(
  // Prettier and eslint are fighting ¯\_(ツ)_/¯
  // eslint-disable-next-line object-curly-newline
  ({ level, message, timestamp, meta }) => {
    if (process.env.NODE_ENV !== 'production') {
      return `${timestamp} ${level}: ${message}${
        level !== 'http' && meta ? `\n${JSON.stringify(meta, null, 2)}` : ''
      }`;
    }
    return `${timestamp} ${level}: ${message}`;
  },
);

/**
 * Initialize the winston transports and loggers. Utilizes two
 * transports:
 *  1. Console
 *  2. AWS S3 Log Files (only used in production)
 *  3. Sentry for Errors (only used in production)
 */
export function initialize(): void {
  // Initialize transports
  if (!consoleTransport) {
    // Initialize console transport
    consoleTransport = new Winston.transports.Console({
      level: process.env.CONSOLE_LOG_LEVEL || 'info',
      format: Winston.format.combine(
        Winston.format.timestamp(),
        Winston.format.colorize(),
        readableFormat,
      ),
    });
  }

  // Set transports to use
  transports = [consoleTransport];
  if (process.env.NODE_ENV === 'production') {
    // transports.push(s3Transport);
  }

  // Initialize logger
  if (!logger) {
    logger = Winston.createLogger({
      transports,
    });
  }

  // Initialize sentry error logging
  if (process.env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      release: process.env.npm_package_version,
    });
  }
}

/**
 * Adds middleware to express which logs all requests
 * that hit the server.
 *
 * @param app
 */
export function addRequestMiddleware(app: Express.Application): void {
  app.use(
    ExpressWinston.logger({
      transports,
      level: 'http',
      meta: true,
      msg: 'HTTP {{req.method}} {{req.url}}',
      expressFormat: true,
      colorize: false,
      bodyBlacklist: ['password'],
      headerBlacklist: ['cookie', 'accept', 'accept-encoding'],
      skip(req, res) {
        // Log all requests that have an error code
        if (res.statusCode >= 400) {
          return false;
        }
        // Ignore successful /assets routes
        return req.url.startsWith('/assets');
      },
    }),
  );
}

/**
 * Add middleware to request which logs uncaught errors which
 * occur during the execution of requests.
 *
 * @param app
 */
export function addErrorMiddleware(app: Express.Application): void {
  app.use(
    ExpressWinston.errorLogger({
      transports,
    }),
  );
}

function log(
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>,
): void {
  logger.log({
    level,
    message,
    meta,
  });

  if (process.env.NODE_ENV === 'production' && level === LogLevel.Error) {
    Sentry.configureScope((scope) => {
      scope.setLevel(Sentry.Severity.Error);
      scope.setExtra('meta', meta);
      Sentry.captureMessage(message);
    });
  }
}

/**
 * Logs a message with the verbose level.
 *
 * @param msg       - The log message
 * @param [meta={}] - Optional meta information to be passed into log.
 */
export const verbose = (msg: string, meta?: Record<string, unknown>): void =>
  log(LogLevel.Verbose, msg, meta);

/**
 * Logs a message with the info level.
 *
 * @param msg       - The log message
 * @param [meta={}] - Optional meta information to be passed into log.
 */
export const info = (msg: string, meta?: Record<string, unknown>): void =>
  log(LogLevel.Info, msg, meta);

/**
 * Logs a message with the warn level.
 *
 * @param msg       - The log message
 * @param [meta={}] - Optional meta information to be passed into log.
 */
export const warn = (msg: string, meta?: Record<string, unknown>): void =>
  log(LogLevel.Warn, msg, meta);

/**
 * Logs a message with error level.
 *
 * @param msg       - The log message
 * @param [meta={}] - Optional meta information to be passed into log.
 */
export const error = (msg: string, meta?: Record<string, unknown>): void =>
  log(LogLevel.Error, msg, meta);
