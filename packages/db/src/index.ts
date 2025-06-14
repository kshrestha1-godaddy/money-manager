import { PrismaClient } from "@prisma/client";

// Get database URL based on environment
const getDatabaseUrl = () => {
    // If DATABASE_URL is explicitly set, use it regardless of environment
    if (process.env.DATABASE_URL) {
        return process.env.DATABASE_URL;
    }
    return process.env.DATABASE_URL_DEV;

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
