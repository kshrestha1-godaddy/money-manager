import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import prisma from "@repo/db/client";
import bcrypt from "bcrypt";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "email", type: "text", placeholder: "" },
        password: { label: "password", type: "password", placeholder: "" },
        number: { label: "number", type: "text", placeholder: "" },
        name: { label: "name", type: "text", placeholder: "" },
      },

      async authorize(credentials: any) {
        const hashedPassword = await bcrypt.hash(credentials.password, 10);

        const existingUser = await prisma.user.findFirst({
          where: {
            name: credentials.name,
          },
        });

        if (existingUser) {
          const passwordValidation = await bcrypt.compare(
            credentials.password,
            existingUser.password,
          );
          if (!passwordValidation) {
            return null;
          }
          return {
            id: existingUser.id.toString(),
            email: credentials.email,
            number: credentials.number,
            password: credentials.password,
            name: credentials.name,
          };
        } else {
          console.log("User not found, creating new user");
          // create the user
          const newUser = await prisma.user.create({
            data: {
              email: credentials.email,
              number: credentials.number,
              password: hashedPassword,
              name: credentials.name,
            },
          });
          return {
            id: newUser.id.toString(),
            email: newUser.email,
            number: newUser.number,
            password: newUser.password,
            name: newUser.name,
          };
        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    session: ({ session, token, user }: any) => {
      if (session.user) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
};
