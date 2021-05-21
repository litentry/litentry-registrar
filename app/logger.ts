import fs from 'fs';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { ConsoleTransportInstance } from 'winston/lib/winston/transports';

const { combine, timestamp, printf, colorize } = winston.format;

let logPath = null;

if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    logPath = './log/litentry/registrar';
} else {
    logPath = '/var/log/litentry/registrar';
}

if (!fs.existsSync(logPath)) {
    fs.mkdirSync(logPath, { recursive: true });
}

const myFormat = printf(({ level, message, timestamp }) => {
    return `${timestamp}--${level}--${message}`;
});

type Transports = DailyRotateFile | ConsoleTransportInstance;

const transports: Transports[] = [
    new DailyRotateFile({
        level: 'debug',
        filename: `${logPath}/debug-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '2048m',
        maxFiles: '31d',
    }),
    new DailyRotateFile({
        level: 'info',
        filename: `${logPath}/info-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '2048m',
        maxFiles: '31d',
    }),
    new DailyRotateFile({
        level: 'error',
        filename: `${logPath}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        zippedArchive: true,
        maxSize: '2048m',
        maxFiles: '31d',
    }),
];

transports.push(
    new winston.transports.Console({
        level: 'debug',
    })
);

const logger = winston.createLogger({
    format: combine(timestamp(), colorize(), myFormat),
    transports: transports,
});

export default logger;
