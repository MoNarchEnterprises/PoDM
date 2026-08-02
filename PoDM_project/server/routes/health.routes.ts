import { Router, Request, Response } from 'express';
import supabase from '../config/supabaseClient';
import logger from '../config/logger';

const router = Router();

interface HealthComponent {
    status: 'healthy' | 'unhealthy' | 'degraded';
    responseTimeMs?: number;
    error?: string;
}

interface HealthResponse {
    status: 'healthy' | 'unhealthy' | 'degraded';
    timestamp: string;
    uptime: number;
    memoryUsage: {
        heapUsedMB: number;
        heapTotalMB: number;
        rssMB: number;
    };
    components: Record<string, HealthComponent>;
}

async function checkDatabase(): Promise<HealthComponent> {
    const start = Date.now();
    try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error) throw error;
        return { status: 'healthy', responseTimeMs: Date.now() - start };
    } catch (err: any) {
        return { status: 'unhealthy', responseTimeMs: Date.now() - start, error: err.message };
    }
}

async function checkRPC(): Promise<HealthComponent> {
    const rpcUrl = process.env.BASE_RPC_URL || process.env.BASE_TESTNET_RPC_URL;
    if (!rpcUrl) {
        return { status: 'degraded', error: 'RPC URL not configured' };
    }
    const start = Date.now();
    try {
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_blockNumber', params: [], id: 1 }),
            signal: AbortSignal.timeout(5000),
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return { status: 'healthy', responseTimeMs: Date.now() - start };
    } catch (err: any) {
        return { status: 'unhealthy', responseTimeMs: Date.now() - start, error: err.message };
    }
}

/**
 * GET /health
 * Deep health check endpoint. Verifies database and RPC connectivity.
 */
router.get('/', async (req: Request, res: Response) => {
    const [database, rpc] = await Promise.all([
        checkDatabase(),
        checkRPC(),
    ]);

    const components: Record<string, HealthComponent> = { database, rpc };

    const memory = process.memoryUsage();
    const allHealthy = Object.values(components).every(c => c.status === 'healthy');
    const anyUnhealthy = Object.values(components).some(c => c.status === 'unhealthy');
    const overallStatus = anyUnhealthy ? 'unhealthy' : allHealthy ? 'healthy' : 'degraded';

    const healthResponse: HealthResponse = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoryUsage: {
            heapUsedMB: Math.round(memory.heapUsed / 1024 / 1024),
            heapTotalMB: Math.round(memory.heapTotal / 1024 / 1024),
            rssMB: Math.round(memory.rss / 1024 / 1024),
        },
        components,
    };

    if (overallStatus !== 'healthy') {
        logger.warn('Health check degraded', { components });
    }

    res.status(overallStatus === 'unhealthy' ? 503 : 200).json(healthResponse);
});

export default router;
