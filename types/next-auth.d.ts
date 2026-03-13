import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      organizationId: string;
      orgName: string;
      role: string;
    } & DefaultSession["user"];
  }
}
