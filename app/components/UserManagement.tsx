"use client";

import { FormEvent, useEffect, useState } from "react";

type UserRole = "CONSULTA" | "COMUNICADOR" | "ADMIN";
type UserStatus = "ATIVO" | "INATIVO";
type ManagedUser = { id: number; login: string; email: string; fullName: string; role: UserRole; status: UserStatus; createdAt: string; createdBy: string };
type UserForm = { login: string; email: string; password: string; fullName: string; role: UserRole; status: UserStatus };

const EMPTY_FORM: UserForm = { login: "", email: "", password: "", fullName: "", role: "CONSULTA", status: "ATIVO" };
const ROLE_LABELS: Record<UserRole, string> = { CONSULTA: "Consulta", COMUNICADOR: "Comunicador", ADMIN: "Administrador" };

export default function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadUsers() {
    const response = await fetch("/api/users", { cache: "no-store" });
    const data = await response.json() as { users?: ManagedUser[]; error?: string };
    if (!response.ok) { setError(data.error ?? "Não foi possível consultar os usuários."); return; }
    setUsers(data.users ?? []);
  }

  useEffect(() => {
    let active = true;
    fetch("/api/users", { cache: "no-store" })
      .then(async response => ({ response, data: await response.json() as { users?: ManagedUser[]; error?: string } }))
      .then(({ response, data }) => {
        if (!active) return;
        if (!response.ok) { setError(data.error ?? "Não foi possível consultar os usuários."); return; }
        setUsers(data.users ?? []);
      })
      .catch(() => { if (active) setError("Não foi possível consultar os usuários."); });
    return () => { active = false; };
  }, []);

  function update<K extends keyof UserForm>(key: K, value: UserForm[K]) {
    setForm(previous => ({ ...previous, [key]: value }));
  }

  function edit(user: ManagedUser) {
    setEditingId(user.id);
    setForm({ login: user.login, email: user.email, password: "", fullName: user.fullName, role: user.role, status: user.status });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function reset() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const payload = { ...form, ...(editingId ? { id: editingId } : {}) };
      if (editingId && !form.password) delete (payload as Partial<UserForm>).password;
      const response = await fetch("/api/users", { method: editingId ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await response.json() as { error?: string };
      if (!response.ok) { setError(data.error ?? "Não foi possível salvar o usuário."); return; }
      setMessage(editingId ? "Usuário atualizado com sucesso." : "Usuário criado com sucesso.");
      setEditingId(null);
      setForm(EMPTY_FORM);
      await loadUsers();
    } catch {
      setError("Não foi possível conectar ao sistema.");
    } finally {
      setBusy(false);
    }
  }

  return <section className="users-layout">
    <form className="user-form-panel" onSubmit={submit}>
      <div className="panel-heading"><div><p className="eyebrow">Acesso ao sistema</p><h2>{editingId ? "Editar usuário" : "Cadastrar usuário"}</h2></div>{editingId ? <button type="button" className="secondary" onClick={reset}>Cancelar edição</button> : null}</div>
      <div className="fields-grid">
        <label><span className="field-label">Login (identificador)<em>*</em></span><input value={form.login} onChange={event => update("login", event.target.value.toLowerCase())} autoComplete="off" placeholder="Ex.: nome.sobrenome" required /></label>
        <label><span className="field-label">E-mail<em>*</em></span><input type="email" value={form.email} onChange={event => update("email", event.target.value)} autoComplete="off" placeholder="nome@dominio.jus.br" required /></label>
        <label className="wide"><span className="field-label">Nome completo<em>*</em></span><input value={form.fullName} onChange={event => update("fullName", event.target.value)} autoComplete="off" required /></label>
        <label><span className="field-label">Perfil<em>*</em></span><select value={form.role} onChange={event => update("role", event.target.value as UserRole)} required><option value="CONSULTA">Consulta</option><option value="COMUNICADOR">Comunicador</option><option value="ADMIN">Administrador</option></select></label>
        <label><span className="field-label">Situação<em>*</em></span><select value={form.status} onChange={event => update("status", event.target.value as UserStatus)} required><option value="ATIVO">Ativo</option><option value="INATIVO">Inativo</option></select></label>
        <label className="wide"><span className="field-label">{editingId ? "Nova senha" : "Senha"}{editingId ? null : <em>*</em>}</span><input type="password" value={form.password} onChange={event => update("password", event.target.value)} autoComplete="new-password" minLength={8} required={!editingId} placeholder={editingId ? "Deixe em branco para manter a senha atual" : "Mínimo de 8 caracteres"} /></label>
      </div>
      {error ? <p className="error" role="alert">{error}</p> : null}
      {message ? <p className="success" role="status">{message}</p> : null}
      <div className="form-actions"><button type="button" className="secondary" onClick={reset}>Limpar</button><button className="primary" disabled={busy}>{busy ? "Salvando..." : editingId ? "Salvar alterações" : "Criar usuário"}</button></div>
    </form>

    <section className="users-list-panel">
      <div className="panel-heading"><div><p className="eyebrow">Controle de acesso</p><h2>Usuários cadastrados</h2><p>{users.length} usuário(s)</p></div></div>
      <div className="users-table-wrap"><table className="users-table"><thead><tr><th>Usuário</th><th>Login</th><th>Perfil</th><th>Situação</th><th></th></tr></thead><tbody>{users.length ? users.map(user => <tr key={user.id}><td><strong>{user.fullName}</strong><small>{user.email}</small></td><td>{user.login}</td><td>{ROLE_LABELS[user.role]}</td><td><span className={`status ${user.status.toLowerCase()}`}>{user.status === "ATIVO" ? "ATIVO" : "INATIVO"}</span></td><td><button className="table-action" onClick={() => edit(user)}>Editar</button></td></tr>) : <tr><td colSpan={5} className="empty-table">Nenhum usuário cadastrado.</td></tr>}</tbody></table></div>
    </section>
  </section>;
}
