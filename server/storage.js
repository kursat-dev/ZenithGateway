const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, 'config.json');

const defaultConfig = {
    keys: [
        { id: '1', key: 'admin-key-123', name: 'Default Admin Key', createdAt: new Date() }
    ],
    routes: [
        { id: '1', path: '/test', target: 'https://json-placeholder.mock.beeceptor.com/users', name: 'Test Route' }
    ],
    logs: []
};

class Storage {
    constructor() {
        if (!fs.existsSync(CONFIG_FILE)) {
            fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
        }
        this.data = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }

    save() {
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.data, null, 2));
    }

    // Keys
    getKeys() { return this.data.keys; }
    addKey(name) {
        const newKey = {
            id: Date.now().toString(),
            key: `sk_${Math.random().toString(36).substr(2, 16)}`,
            name,
            createdAt: new Date()
        };
        this.data.keys.push(newKey);
        this.save();
        return newKey;
    }
    revokeKey(id) {
        this.data.keys = this.data.keys.filter(k => k.id !== id);
        this.save();
    }

    // Routes
    getRoutes() { return this.data.routes; }
    addRoute(route) {
        const newRoute = { id: Date.now().toString(), ...route };
        this.data.routes.push(newRoute);
        this.save();
        return newRoute;
    }
    deleteRoute(id) {
        this.data.routes = this.data.routes.filter(r => r.id !== id);
        this.save();
    }

    // Logs
    addLog(log) {
        this.data.logs.unshift({ id: Date.now().toString(), timestamp: new Date(), ...log });
        if (this.data.logs.length > 100) this.data.logs.pop(); // Keep last 100
        this.save();
    }
    getLogs() { return this.data.logs; }
}

module.exports = new Storage();
