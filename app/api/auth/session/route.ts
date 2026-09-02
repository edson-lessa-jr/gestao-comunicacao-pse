import { authenticatedUser } from "../../../lib/auth";

export async function GET(request: Request) {
  const user = await authenticatedUser(request);
  return user ? Response.json({ user }) : Response.json({ error: "Não autenticado" }, { status: 401 });
}
