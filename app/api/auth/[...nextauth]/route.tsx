import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// Cette ligne crée le gestionnaire d'authentification
const handler = NextAuth(authOptions);

// Ces exports sont obligatoires pour que Next.js reconnaisse les méthodes HTTP
export { handler as GET, handler as POST };