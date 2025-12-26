const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const storage = require('./storage');

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 1. Logger Middleware
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        if (req.originalUrl.startsWith('/api-gateway')) return; // Don't log management API

        storage.addLog({
            method: req.method,
            path: req.originalUrl,
            status: res.statusCode,
            duration,
            ip: req.ip
        });
    });
    next();
};
app.use(requestLogger);

// 2. Auth Middleware (API Key)
const authenticate = (req, res, next) => {
    const apiKey = req.headers['x-api-key'];
    if (!apiKey) {
        return res.status(401).json({ error: 'API key is missing' });
    }

    const keyExists = storage.getKeys().find(k => k.key === apiKey);
    if (!keyExists) {
        return res.status(403).json({ error: 'Invalid API key' });
    }

    req.apiKey = keyExists;
    next();
};

// 3. Rate Limiter
const gatewayLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests, please try again later.' },
    keyGenerator: (req) => req.headers['x-api-key'] || req.ip,
    validate: { trustProxy: false }
});

// --- MANAGEMENT API ---
app.get('/api-gateway/stats', (req, res) => {
    const logs = storage.getLogs();
    const stats = {
        totalRequests: logs.length,
        averageLatency: logs.length ? Math.round(logs.reduce((acc, log) => acc + log.duration, 0) / logs.length) : 0,
        errorRate: logs.length ? Math.round((logs.filter(l => l.status >= 400).length / logs.length) * 100) : 0,
        recentLogs: logs.slice(0, 5)
    };
    res.json(stats);
});

app.get('/api-gateway/routes', (req, res) => res.json(storage.getRoutes()));
app.post('/api-gateway/routes', (req, res) => res.json(storage.addRoute(req.body)));
app.delete('/api-gateway/routes/:id', (req, res) => {
    storage.deleteRoute(req.params.id);
    res.json({ success: true });
});

app.get('/api-gateway/keys', (req, res) => res.json(storage.getKeys()));
app.post('/api-gateway/keys', (req, res) => res.json(storage.addKey(req.body.name)));
app.delete('/api-gateway/keys/:id', (req, res) => {
    storage.revokeKey(req.params.id);
    res.json({ success: true });
});

// --- DYNAMIC PROXY ROUTING ---
app.use((req, res, next) => {
    const routes = storage.getRoutes();
    const route = routes.find(r => req.path.startsWith(r.path));

    if (route) {
        return authenticate(req, res, () => {
            return gatewayLimiter(req, res, () => {
                const proxy = createProxyMiddleware({
                    target: route.target,
                    changeOrigin: true,
                    pathRewrite: { [`^${route.path}`]: '' },
                    logger: console,
                });
                return proxy(req, res, next);
            });
        });
    }
    next();
});

// Default 404
app.use((req, res) => {
    res.status(404).json({ error: 'Gateway path not found' });
});

app.listen(PORT, () => {
    console.log(`🌌 ZenithGateway Core running on http://localhost:${PORT}`);
});
