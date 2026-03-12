import { createAuthClient } from "better-auth/react";
import {
  adminClient,
  emailOTPClient,
  magicLinkClient,
} from "better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [adminClient(), emailOTPClient(), magicLinkClient()],
});
