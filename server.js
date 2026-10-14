const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const swaggerUi = require('swagger-ui-express');

const env = require('./config/env');
const connectDB = require('./config/db');
const swaggerSpec = require('./config/swagger');
const { initSocket } = require('./utils/socketEmitter');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const notFound = require('./middlewares/notFound');

const app = express();
const server = http.createServer(app);

const path = require('path');
const fs = require('fs');

// Permissive dynamic CORS for local dev and cloud deployments (Vercel, Netlify, Render, Railway)
const isAllowedOrigin = (origin) => {
  if (!origin) return true; // allow non-browser requests
  if (
    origin === env.CLIENT_URL ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1') ||
    origin.endsWith('.vercel.app') ||
    origin.endsWith('.netlify.app') ||
    origin.endsWith('.onrender.com') ||
    origin.endsWith('.railway.app')
  ) {
    return true;
  }
  return true; // Allow all origins with credentials in development/staging
};

const corsOptions = {
  origin: (origin, callback) => {
    callback(null, isAllowedOrigin(origin));
  },
  credentials: true,
};

// Initialize Socket.IO
const io = new Server(server, {
  cors: corsOptions,
});
initSocket(io);

// Security & Parsing Middlewares
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows Swagger UI and local development
  })
);

app.use(cors(corsOptions));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Swagger Documentation UI
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    environment: env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Master API Routes Prefix
app.use('/api/v1', routes);

// Serve static frontend build if present (monolithic deployment support)
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 Handler & Centralized Error Handler
app.use(notFound);
app.use(errorHandler);

// Start server function (deferred in test mode)
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    server.listen(env.PORT, () => {
      console.log(`====================================================`);
      console.log(`🏥 EMR Hospital Backend running on port ${env.PORT}`);
      console.log(`📖 Swagger API Docs: http://localhost:${env.PORT}/api/v1/docs`);
      console.log(`⚡ Socket.IO initialized for real-time sync`);
      console.log(`====================================================`);
    });
  });
}

module.exports = { app, server, io };
