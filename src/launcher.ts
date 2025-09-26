#!/usr/bin/env node
import dotenv from 'dotenv';
dotenv.config();

import { spawn, ChildProcess } from 'child_process';
import express from 'express';
import open from 'open';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProxyMiddleware } from 'http-proxy-middleware';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const SUMIKA_API_URL = process.env.SUMIKA_API_URL || 'http://localhost:8787';
const app = express();

let sumikaProcess: ChildProcess | null = null;

function startSumikaServer() {
    // Only start the sumika server if we're using the default local URL
    if (SUMIKA_API_URL === 'http://localhost:8787') {
        const sumikaPath = path.resolve(__dirname, '..', 'node_modules', '.bin', 'sumika');

        console.log('Starting local Sumika server...');
        sumikaProcess = spawn(sumikaPath, [], {
            stdio: 'inherit',
            env: {
                ...process.env,
            },
        });

        sumikaProcess.on('close', (code) => {
            console.log(`Sumika server process exited with code ${code}`);
            if (code !== 0) {
                console.error('Sumika server exited with an error. Please check the logs.');
            }
        });
    } else {
        console.log(`Connecting to remote Sumika server at ${SUMIKA_API_URL}`);
    }
}

function startProxyAndStaticServer() {
  // Proxy API requests
  app.use(createProxyMiddleware({
    pathFilter: '/api',
                target: SUMIKA_API_URL,    changeOrigin: true,
    ws: true, // for websocket support if needed in the future
  }));

  // Serve static UI files
  const uiPath = path.join(__dirname, 'ui');
  app.use(express.static(uiPath));
  app.use((req, res) => {
    res.sendFile(path.join(uiPath, 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`Utsuwa UI is being served at http://localhost:${PORT}`);
    open(`http://localhost:${PORT}`);
  });
}

function gracefulShutdown() {
  console.log('Shutting down...');
  if (sumikaProcess) {
    sumikaProcess.kill();
  }
  process.exit();
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

startSumikaServer();
startProxyAndStaticServer();
