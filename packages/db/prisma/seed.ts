import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

async function main() {
    const alice = await prisma.user.upsert({
        where: { number: "1111111111" },
        update: {},
        create: {
            number: "1111111111",
            password: await bcrypt.hash("alice", 10),
            name: "alice",
        },
    });
    const bob = await prisma.user.upsert({
        where: { number: "2222222222" },
        update: {},
        create: {
            number: "2222222222",
            password: await bcrypt.hash("bob", 10),
            name: "bob",
        },
    });
    console.log({ alice, bob });
}
main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error(e);
        await prisma.$disconnect();
        process.exit(1);
    });
