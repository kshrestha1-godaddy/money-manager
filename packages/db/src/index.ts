import { PrismaClient } from "@prisma/client";

// Get database URL based on environment
const getDatabaseUrl = () => {
    if (process.env.NODE_ENV === 'development') {
        return process.env.DATABASE_URL_DEV || process.env.DATABASE_URL;
    }
    if (process.env.NODE_ENV === 'test') {
        return process.env.DATABASE_URL_TEST || process.env.DATABASE_URL;
    }
    return process.env.DATABASE_URL; // production
};

const prismaClientSingleton = () => {
    return new PrismaClient({
        datasources: {
            db: {
                url: getDatabaseUrl(),
            },
        },
        transactionOptions: {
            maxWait: 5000, // default: 2000
            timeout: 30000, // default: 5000
        },
        // log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    });
};

declare global {
    var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma: ReturnType<typeof prismaClientSingleton> =
    globalThis.prismaGlobal ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;
