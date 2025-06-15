import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import prisma from "@repo/db/client";
import bcrypt from "bcrypt";
import { isEmailWhitelisted } from "../actions/whitelist";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        number: { label: "number", type: "text", placeholder: "" },
        password: { label: "password", type: "password", placeholder: "" },
      },

      async authorize(credentials: any) {

        if (!credentials.number || !credentials.password) {
          return null;
        }

        // console.log("credentials", credentials);

        const existingUser = await prisma.user.findFirst({
          where: {
            number: credentials.number,
          },
        });

        // console.log("existingUser", existingUser);

        if (existingUser) {
          // Check if user's email is whitelisted (if they have an email)
          if (existingUser.email && !(await isEmailWhitelisted(existingUser.email))) {
            return null; // Return null instead of throwing error
          }

          // Compare raw passwords since they're stored as plain text in the database
          if (credentials.password !== existingUser.password) {
            return null;
          }
          return {
            id: existingUser.id.toString(),
            number: credentials.number,
            password: credentials.password,
            name: existingUser.name,
            email: existingUser.email,
            image: existingUser.profilePictureUrl || credentials.image, 
          };
        } else {
          console.log("User not found, signup new user");
          return null;

        }
      },
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],
  secret: process.env.NEXTAUTH_SECRET,
  
  pages: {
    signIn: "/signin",
    // signUp: "/signup",
  },

  callbacks: {
    session: ({ session, token, user }: any) => {
      if (session.user) {
        session.user.id = token.sub;
      }
      return session;
    },

    async signIn({ user, account, profile }: any) {
      // Check for Google OAuth
      if (account?.provider === "google") {
        if (!user.email || !(await isEmailWhitelisted(user.email))) {
          // console.log("Unauthorized email attempted to sign in:", user.email);
          // Pass the email in the redirect URL so it can be pre-populated in the form
          const encodedEmail = encodeURIComponent(user.email || "");
          return `/subscribe?reason=unauthorized&email=${encodedEmail}`;
        }
      }
      return true;
    },

    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // If redirecting to subscribe page, allow it
      if (url.startsWith("/subscribe")) {
        return `${baseUrl}${url}`;
      }
      
      // Default redirect after successful sign in
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/dashboard`;
      }
      
      return baseUrl;
    },
  },
};
