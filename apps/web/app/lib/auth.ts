import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

import prisma from "@repo/db/client";
import bcrypt from "bcrypt";
import { isEmailWhitelisted } from "./whitelist";

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

        const hashedPassword = await bcrypt.hash(credentials.password, 10);

        const existingUser = await prisma.user.findFirst({
          where: {
            number: credentials.number,
          },
        });

        if (existingUser) {
          // Check if user's email is whitelisted (if they have an email)
          if (existingUser.email && !(await isEmailWhitelisted(existingUser.email))) {
            return null; // Return null instead of throwing error
          }

          const passwordValidation = await bcrypt.compare(
            credentials.password,
            existingUser.password,
          );
          if (!passwordValidation) {
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
    error: "/auth/error", // Custom error page
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
          console.log("Unauthorized email attempted to sign in:", user.email);
          return "/subscribe?reason=unauthorized"; // Redirect to subscribe page
        }
      }
      
      // Check for credentials provider (if user has email)
      if (account?.provider === "credentials" && user.email) {
        if (!(await isEmailWhitelisted(user.email))) {
          console.log("Unauthorized email attempted to sign in:", user.email);
          return "/subscribe?reason=unauthorized"; // Redirect to subscribe page
        }
      }
      
      return true;
    },

    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // If redirecting to subscribe page, allow it
      if (url.startsWith("/subscribe")) {
        return `${baseUrl}${url}`;
      }
      
      // Check if there's an error parameter indicating unauthorized access
      if (url.includes("error=AccessDenied") || url.includes("error=OAuthAccountNotLinked")) {
        return `${baseUrl}/subscribe?reason=unauthorized`;
      }
      
      // If the url is the error page, redirect to subscribe
      if (url.includes("/auth/error")) {
        return `${baseUrl}/subscribe?reason=unauthorized`;
      }
      
      // Default redirect after successful sign in
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/dashboard`;
      }
      
      return baseUrl;
    },
  },
};
