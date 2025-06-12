import { PrismaClient } from "@prisma/client";

const prismaClientSingleton = () => {
    return new PrismaClient({
        datasources: {
            db: {
                url: process.env.DATABASE_URL,
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
