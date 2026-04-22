import { DefaultSession } from "next-auth";

declare module "next-auth" {
    interface Session {
        user: {
            role?: string;
            cargo?: string;
            dni?: string;
            supervisor?: string;
            phone?: string;
            sessionToken?: string;
            campania?: string;
        } & DefaultSession["user"];
    }

    interface User {
        role?: string;
        cargo?: string;
        supervisor?: string;
        phone?: string;
        sessionToken?: string;
        campania?: string;
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id?: string;
        role?: string;
        cargo?: string;
        dni?: string;
        supervisor?: string;
        phone?: string;
        sessionToken?: string;
        campania?: string;
    }
}