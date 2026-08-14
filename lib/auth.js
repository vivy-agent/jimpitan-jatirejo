import GoogleProvider from "next-auth/providers/google";
import db from "@/lib/db";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId:
        process.env.GOOGLE_CLIENT_ID,

      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    async signIn({ user }) {
      const email = user.email;
      const name = user.name;
      const image = user.image;

      const [rows] = await db.query(
        "SELECT * FROM users WHERE email = ?",
        [email]
      );

      if (rows.length === 0) {
        let role = "admin";
        let status = "pending";

        if (
          email ===
          "adtynmhndra123@gmail.com"
        ) {
          role = "master";
          status = "approved";
        }

        await db.query(
          `
          INSERT INTO users
          (
            name,
            email,
            image,
            role,
            status
          )
          VALUES (?, ?, ?, ?, ?)
          `,
          [
            name,
            email,
            image,
            role,
            status,
          ]
        );
      } else {
        await db.query(
          `
          UPDATE users
          SET
            name = ?,
            image = ?
          WHERE email = ?
          `,
          [
            name,
            image,
            email,
          ]
        );
      }

      return true;
    },

    async jwt({ token }) {
      if (token.email) {
        const [rows] =
          await db.query(
            `
            SELECT
              role,
              status
            FROM users
            WHERE email = ?
            LIMIT 1
            `,
            [token.email]
          );

        if (rows.length > 0) {
          token.role =
            rows[0].role;

          token.status =
            rows[0].status;
        }
      }

      return token;
    },

    async session({
      session,
      token,
    }) {
      if (session.user) {
        session.user.role =
          token.role;

        session.user.status =
          token.status;
      }

      return session;
    },
  },
};