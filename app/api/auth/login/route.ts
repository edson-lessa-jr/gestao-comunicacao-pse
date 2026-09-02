import { createSessionCookie, verifyCredentials } from "../../../lib/auth";

export async function POST(request: Request) {
  try {
    const { username = "", password = "" } = await request.json() as { username?: string; password?: string };
    const user = await verifyCredentials(username, password);
    if (!user) return Response.json({ error: "Credenciais inválidas" }, { status: 401 });
    return Response.json({ user }, { headers: { "Set-Cookie": await createSessionCookie(user) } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao autenticar" }, { status: 500 });
  }
}
