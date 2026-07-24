import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

/**
 * NextAuth (credentials) configuration. Email/password auth backed by Kysely,
 * JWT sessions, with the driver's role, driverId and carrierId carried on the
 * token for role-based access control.
 */
export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        try {
          const parsed = credentialsSchema.safeParse(raw);
          if (!parsed.success) {
            console.error("Credentials validation failed:", parsed.error);
            return null;
          }

          const user = await db
            .selectFrom("User")
            .selectAll()
            .where("email", "=", parsed.data.email.toLowerCase())
            .executeTakeFirst();

          if (!user) {
            console.error("User not found:", parsed.data.email);
            return null;
          }

          const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
          if (!valid) {
            console.error("Password verification failed for:", parsed.data.email);
            return null;
          }

          const driver = await db
            .selectFrom("Driver")
            .select("id")
            .where("userId", "=", user.id)
            .executeTakeFirst();

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            driverId: driver?.id ?? null,
            carrierId: user.carrierId ?? null,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.driverId = user.driverId;
        token.carrierId = user.carrierId;
        console.log("JWT callback - user signed in:", user.email);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.driverId = token.driverId;
        session.user.carrierId = token.carrierId;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
