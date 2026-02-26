import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!)

redis.on('connect', () => {
    console.log('[Redis] Connected successfully');
});

redis.on('error', error => {
    console.error('[Redis] Connection error:', error.message);
});

export default redis