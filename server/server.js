/**
 * Uptime Kuma - Server Entry Point
 * Main server file that initializes the Express app and Socket.IO
 */

const { log } = require("../src/util");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || "0.0.0.0";
const DATA_DIR = process.env.DATA_DIR || "./data";

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    log.info("server", `Created data directory: ${DATA_DIR}`);
}

// Serve static files from the dist folder (built frontend)
app.use(express.static(path.join(__dirname, "../dist")));

// Parse JSON request bodies
app.use(express.json());

// Basic health check endpoint
app.get("/api/health", (req, res) => {
    res.json({ status: "ok", version: require("../package.json").version });
});

// Catch-all route to serve the SPA
app.get("*", (req, res) => {
    const indexPath = path.join(__dirname, "../dist/index.html");
    if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
    } else {
        res.status(503).send("Frontend not built. Run `npm run build` first.");
    }
});

// Socket.IO connection handling
io.on("connection", (socket) => {
    log.info("server", `New client connected: ${socket.id}`);

    socket.on("disconnect", () => {
        log.info("server", `Client disconnected: ${socket.id}`);
    });

    // Heartbeat to keep connection alive
    socket.on("ping", (callback) => {
        if (typeof callback === "function") {
            callback();
        }
    });
});

// Start the server
server.listen(PORT, HOST, () => {
    log.info("server", `Uptime Kuma is running on http://${HOST}:${PORT}`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
    log.info("server", "Received SIGTERM, shutting down gracefully...");
    server.close(() => {
        log.info("server", "Server closed.");
        process.exit(0);
    });
});

process.on("SIGINT", () => {
    log.info("server", "Received SIGINT, shutting down gracefully...");
    server.close(() => {
        log.info("server", "Server closed.");
        process.exit(0);
    });
});

module.exports = { app, server, io };
