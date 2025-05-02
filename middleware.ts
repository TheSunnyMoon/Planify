import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // Chemin de la page actuelle
  const path = request.nextUrl.pathname;
  
  // Pages publiques qui ne nécessitent pas d'authentification
  const publicPaths = ["/", "/login", "/register", "/api/auth", "/api/register"];
  
  // Vérifier si le chemin actuel est public
  const isPublicPath = publicPaths.some(publicPath => 
    path === publicPath || path.startsWith(publicPath + "/")
  );
  
  // Si API route ou ressource statique, on laisse passer
  if (path.startsWith("/api/") && !path.startsWith("/api/protected/")) {
    return NextResponse.next();
  }
  
  // Vérifier si l'utilisateur est authentifié
  const token = await getToken({ 
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  // Traitement des pages publiques
  if (isPublicPath) {
    // Uniquement rediriger les utilisateurs connectés qui tentent d'accéder à login/register
    if (token && (path === "/login" || path === "/register")) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
    
    // Ne pas rediriger pour les autres pages publiques
    return NextResponse.next();
  }
  
  // À ce stade, c'est une page protégée
  if (!token) {
    // Utilisateur non connecté essayant d'accéder à une page protégée
    const url = new URL("/login", request.url);
    url.searchParams.set("callbackUrl", encodeURI(request.url));
    return NextResponse.redirect(url);
  }
  
  // Utilisateur connecté accédant à une page protégée
  return NextResponse.next();
}

// Configurer les chemins sur lesquels ce middleware s'applique
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"]
};