import Dotenv = require('dotenv');
import Express = require('express');
import ExpressSession = require('express-session');
import Helmet = require('helmet');
import Passport = require('passport');
import path = require('path');
import * as Logger from './log';
import * as DB from './db';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ConnectMongo = require('connect-mongo')(ExpressSession);

Dotenv.config();
Logger.initialize();

// Initialize express application
Logger.info('Starting Node.js server...');
const app: Express.Application = Express();

// Use PUG for templating
app.set('view engine', 'pug');
app.locals.basedir = path.join(__dirname, 'views');

// Use JSON parser
app.use(Express.json());

// Use body parser
app.use(Express.urlencoded({ extended: true }));

// Security middleware
app.use(Helmet());

// Add request logging middleware
Logger.addRequestMiddleware(app);

// Connect to MongoDB database
DB.connect((err, clientInstance) => {
  if (!err) {
    // If in production, then trust ngninx proxy
    if (process.env.NODE_ENV === 'production') {
      app.enable('trust proxy');
    }

    // Use express-session for session management
    app.use(
      ExpressSession({
        name: 'sksession',
        secret: process.env.EXPRESS_SESSION_SECRET || '',
        resave: false,
        saveUninitialized: false,
        rolling: true,
        proxy: true,
        cookie: {
          // Session expires after 24hrs (given in milliseconds)
          maxAge: 24 * 3600 * 1000,
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
        },
        store: new ConnectMongo({
          client: clientInstance,
          dbName: 'serverkeeper',
          // Create TTL indexes on session collection
          autoRemove: 'native',
          // Only save rolling session cookie every 1 hour (given in seconds)
          touchAfter: 3600,
          stringify: false,
        }),
      }),
    );

    // Initialize passport and open a passport session
    app.use(Passport.initialize());
    app.use(Passport.session());

    // Use passport local authentication strategy
    // Passport.use('local', LocalStrategy);

    // Serve all routes
    // app.use(Routes);

    // Add error logging middleware
    Logger.addErrorMiddleware(app);

    // Start Node.js app
    Logger.info('Node.js server running!');
    app.listen(process.env.EXPRESS_PORT);
  }
});
