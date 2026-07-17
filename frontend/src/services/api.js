import axios from "axios"

const api = axios.create({
  baseURL: "/api",
})

// Injeta a matrícula do aluno logado em toda request — usado pelo backend
// pra checar is_admin nas rotas /admin. Sistema não usa JWT.
api.interceptors.request.use((config) => {
  const raw = localStorage.getItem("aluno")
  if (raw) {
    const aluno = JSON.parse(raw)
    config.headers["X-Aluno-Matricula"] = aluno.matricula
  }
  return config
})

export const alunoService = {
  cadastrar: (formData) => api.post("/alunos/", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  }),
  buscar: (matricula) => api.get(`/alunos/${matricula}`),
  login: (matricula, senha) => {
    const form = new FormData()
    form.append("matricula", matricula)
    form.append("senha", senha)
    return api.post("/alunos/login", form)
  },
}

export const disciplinaService = {
  listar: () => api.get("/disciplinas/"),
  criar: (data) => api.post("/disciplinas/admin/", data),
  editar: (id, data) => api.patch(`/disciplinas/admin/${id}`, data),
  excluir: (id) => api.delete(`/disciplinas/admin/${id}`),
}

export const turmaService = {
  criar: (data) => api.post("/disciplinas/admin/turmas", data),
  editar: (id, data) => api.patch(`/disciplinas/admin/turmas/${id}`, data),
  excluir: (id) => api.delete(`/disciplinas/admin/turmas/${id}`),
}

export const inscricaoService = {
  inscrever: (matricula, inscricoes) => api.post(`/inscricoes/${matricula}`, inscricoes),
  minhas: (matricula) => api.get(`/inscricoes/${matricula}`),
  escolherAlternativa: (data) => api.post("/inscricoes/alternativa/escolher", data),
}

export const escalonamentoService = {
  listar: () => api.get("/escalonamento/lista"),
}

export const adminService = {
  alocar: () => api.post("/admin/alocar"),
  pendentes: () => api.get("/alunos/admin/pendentes"),
  todos: () => api.get("/alunos/admin/todos"),
  validar: (id) => api.patch(`/alunos/admin/${id}/validar`),
  rejeitar: (id, motivo) => api.patch(`/alunos/admin/${id}/rejeitar`, { motivo }),
  estatisticas: () => api.get("/admin/estatisticas"),
  getPeriodo: () => api.get("/admin/periodo"),
  abrirPeriodo: () => api.post("/admin/periodo/abrir"),
  fecharPeriodo: () => api.post("/admin/periodo/fechar"),
  administradores: () => api.get("/admin/administradores"),
  promover: (id) => api.post(`/admin/promover/${id}`),
  rebaixar: (id) => api.post(`/admin/rebaixar/${id}`),
  prioritarios: () => api.get("/admin/prioritarios"),
  definirPrioridade: (id, ativar, motivo) => api.post(`/admin/prioridade/${id}`, { ativar, motivo }),
}

export default api
