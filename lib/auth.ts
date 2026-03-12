import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {prisma} from "./prisma";
import { admin, emailOTP, magicLink } from "better-auth/plugins";
import { userExists } from "./userExist";
import {
  sendEmail,
  getOTPEmailTemplate,
  getPasswordResetEmailTemplate,
  getVerificationEmailTemplate,
} from "./email";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url, token }, request) => {
      console.log("[Auth] Sending password reset email to:", user.email);
      const emailTemplate = getPasswordResetEmailTemplate(url);
      void sendEmail({
        to: user.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text,
      })
        .then(() => {
          console.log("[Auth] Password reset email sent successfully");
        })
        .catch((err) => {
          console.error("[Auth] Failed to send password reset email:", err);
        });
    },
    onPasswordReset: async ({ user }, request) => {
      console.log(`[Auth] Password for user ${user.email} has been reset.`);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      console.log("[Auth] Sending verification email to:", user.email);
      try {
        const template = getVerificationEmailTemplate(url);
        await sendEmail({
          to: user.email,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
        console.log("[Auth] Verification email sent successfully");
      } catch (err) {
        console.error("[Auth] Failed to send verification email:", err);
      }
    },
  },
  plugins: [
    admin(),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        const title =
          type === "sign-in"
            ? "Your Sign-In Code"
            : type === "email-verification"
              ? "Verify Your Email"
              : "Your Verification Code";
        const emailTemplate = getOTPEmailTemplate(otp, title);
        await sendEmail({
          to: email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
        });
      },
    }),
    magicLink({
            sendMagicLink: async ({ email, url }) => {
                console.log("[Auth] Magic link request for:", email);
                const exists = await userExists(email);
                console.log("[Auth] User exists check:", exists);
                if (exists) {
                    try {
                        await sendEmail({
                            to: email,
                            subject: "Your magic sign-in link",
                            text: `Click the link to sign in: ${url}`,
                        });
                        console.log("[Auth] Magic link email sent successfully to:", email);
                    } catch (err) {
                        console.error("[Auth] Failed to send magic link email:", err);
                    }
                }
            },
        })
  ],
});
