const redis = require('redis');

let isRedisConnected = false;

// Redis client setup
const client = redis.createClient({ 
  url: process.env.REDIS_URL || 'redis://localhost:6379' 
});

client.on('connect', () => { 
  isRedisConnected = true; 
  console.log('⚡ Redis connected successfully'); 
});

client.on('error', (err) => { 
  isRedisConnected = false; 
  console.warn('⚠️ Redis connection error (falling back to MongoDB):', err.message); 
});

// Connect to Redis
client.connect().catch(console.error);

module.exports = { client, isRedisConnected };