import Transport = require('winston-transport');
// @ts-ignore UPSTREAM
import S3StreamLogger = require('s3-streamlogger');
import Winston = require('winston');
import ExpressWinston = require('express-winston');
import Sentry = require('@sentry/node');
import Express = require('express');

let consoleTransport: Winston.transports.ConsoleTransportInstance;
let s3Transport: Winston.transports.StreamTransportInstance;
let transports: Transport[];
let logger: Winston.Logger;

/**
 * Helper constant to produce a readable output
 * for winston console logs.
 */
const readableFormat = Winston.format.printf(
  ({ level, message, timestamp, meta }) => {
    if (process.env.NODE_ENV !== 'production' && meta !== {})
      return `${timestamp} ${level}: ${message}\n${JSON.stringify(meta)}`;
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
      level: 'info',
      format: Winston.format.combine(
        Winston.format.timestamp(),
        Winston.format.colorize(),
        readableFormat,
      ),
    });
  }

  if (!s3Transport && process.env.NODE_ENV === 'production') {
    s3Transport = new Winston.transports.Stream({
      stream: new S3StreamLogger.S3StreamLogger({
        bucket: process.env.WINSTON_S3_BUCKET,
        folder: process.env.WINSTON_S3_FOLDER,
        access_key_id: process.env.WINSTON_S3_ACCESS_KEY_ID,
        secret_access_key: process.env.WINSTON_S3_SECRET,
      }),
      format: Winston.format.combine(
        Winston.format.timestamp(),
        Winston.format.json(),
      ),
    });
    s3Transport.on('error', (err) => {
      // eslint-disable-next-line no-console
      console.error('S3 logging transport error', err);
    });
  }

  // Set transports to use
  transports = [consoleTransport];
  if (process.env.NODE_ENV === 'production') {
    transports.push(s3Transport);
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

/**
 * Logs a message with the info level.
 *
 * @param msg       - The log message
 * @param [meta={}] - Optional meta information to be passed into log.
 */
export function info(msg: string, meta?: Record<string, unknown>): void {
  logger.log({
    level: 'info',
    message: msg,
    meta,
  });
}

/**
 * Logs a message with the warn level.
 *
 * @param msg       - The log message
 * @param [meta={}] - Optional meta information to be passed into log.
 */
export function warn(msg: string, meta?: Record<string, unknown>): void {
  logger.log({
    level: 'warn',
    message: msg,
    meta,
  });
}

/**
 * Logs a message with error level.
 *
 * @param msg       - The log message
 * @param [meta={}] - Optional meta information to be passed into log.
 */
export function error(msg: string, meta?: Record<string, unknown>): void {
  logger.log({
    level: 'error',
    message: msg,
    meta,
  });

  if (process.env.NODE_ENV === 'production') {
    Sentry.configureScope((scope) => {
      scope.setLevel(Sentry.Severity.Error);
      scope.setExtra('meta', meta);
      Sentry.captureMessage(msg);
    });
  }
}
