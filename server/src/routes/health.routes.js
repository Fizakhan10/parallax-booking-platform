/**
 * Health Check Routes
 * 
 * Endpoints for monitoring application health, dependencies, and readiness
 */

import express from 'express';
import mongoose from 'mongoose';
import { getRedisClient } from '../utils/redisClient.js';

const router = express.Router();

/**
 * Basic health check - API is responding
 * Used by: Docker healthcheck, load balancers
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * Liveness probe - Process is alive
 * Used by: Kubernetes liveness probe
 */
router.get('/health/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

/**
 * Readiness probe - Service is ready to accept traffic
 * Checks all critical dependencies
 * Used by: Kubernetes readiness probe, deployment systems
 */
router.get('/health/ready', async (req, res) => {
  const checks = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    checks: {}
  };

  let allHealthy = true;

  // Check MongoDB
  try {
    if (mongoose.connection.readyState === 1) {
      // Ping database
      await mongoose.connection.db.admin().ping();
      checks.checks.mongodb = {
        status: 'healthy',
        message: 'Connected and responsive'
      };
    } else {
      throw new Error('Not connected');
    }
  } catch (error) {
    allHealthy = false;
    checks.checks.mongodb = {
      status: 'unhealthy',
      message: error.message
    };
  }

  // Check Redis (optional - graceful degradation)
  try {
    const redis = getRedisClient();
    if (redis.isConnected) {
      await redis.client.ping();
      checks.checks.redis = {
        status: 'healthy',
        message: 'Connected and responsive'
      };
    } else {
      checks.checks.redis = {
        status: 'degraded',
        message: 'Not connected (fallback mode active)'
      };
    }
  } catch (error) {
    checks.checks.redis = {
      status: 'degraded',
      message: `Error: ${error.message} (fallback mode active)`
    };
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const memoryHealthy = memUsage.heapUsed / memUsage.heapTotal < 0.9; // Alert if >90%
  
  checks.checks.memory = {
    status: memoryHealthy ? 'healthy' : 'warning',
    heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
    percentage: `${Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)}%`
  };

  if (!memoryHealthy) {
    allHealthy = false;
  }

  checks.status = allHealthy ? 'ready' : 'degraded';
  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json(checks);
});

/**
 * Detailed system info
 * Used by: Monitoring dashboards, debugging
 */
router.get('/health/info', async (req, res) => {
  const memUsage = process.memoryUsage();
  
  const info = {
    service: 'SaaS Booking Platform API',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: {
      seconds: Math.floor(process.uptime()),
      formatted: formatUptime(process.uptime())
    },
    memory: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memUsage.external / 1024 / 1024)}MB`
    },
    timestamp: new Date().toISOString()
  };

  // Add database info
  try {
    if (mongoose.connection.readyState === 1) {
      const dbStats = await mongoose.connection.db.stats();
      info.database = {
        status: 'connected',
        name: mongoose.connection.name,
        collections: dbStats.collections,
        dataSize: `${Math.round(dbStats.dataSize / 1024 / 1024)}MB`,
        storageSize: `${Math.round(dbStats.storageSize / 1024 / 1024)}MB`
      };
    } else {
      info.database = { status: 'disconnected' };
    }
  } catch (error) {
    info.database = { status: 'error', message: error.message };
  }

  // Add Redis info
  try {
    const redis = getRedisClient();
    info.redis = {
      status: redis.isConnected ? 'connected' : 'disconnected',
      mode: redis.isConnected ? 'active' : 'fallback'
    };
  } catch (error) {
    info.redis = { status: 'error', message: error.message };
  }

  res.json(info);
});

/**
 * Format uptime in human-readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  parts.push(`${secs}s`);

  return parts.join(' ');
}

export default router;
