import winston from 'winston';

const { combine, timestamp, json, colorize, printf, errors } = winston.format;

// Human-readable format for development
const devFormat = combine(
    colorize(),
    timestamp({ format: 'HH:mm:ss' }),
    errors({ stack: true }),
    printf(({ level, message, timestamp, requestId, ...meta }) => {
        const reqIdTag = requestId ? ` [${requestId}]` : '';
        const metaStr = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} ${level}${reqIdTag}: ${message}${metaStr}`;
    })
);

// Structured JSON format for production
const prodFormat = combine(
    timestamp(),
    errors({ stack: true }),
    json()
);

const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
    format: isProduction ? prodFormat : devFormat,
    defaultMeta: { service: 'podm-api' },
    transports: [
        new winston.transports.Console(),
    ],
});

// Add file transport for errors in production
if (isProduction) {
    logger.add(new winston.transports.File({
        filename: 'error.log',
        level: 'error',
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
    }));
}

export default logger;
