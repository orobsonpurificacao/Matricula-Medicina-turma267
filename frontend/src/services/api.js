import axios from "axios"

const api = axios.create({
  baseURL: "/api",
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
}

export const inscricaoService = {
  inscrever: (matricula, inscricoes) => api.post(`/inscricoes/${matricula}`, inscricoes),
  minhas: (matricula) => api.get(`/inscricoes/${matricula}`),
  escolherAlternativa: (data) => api.post("/inscricoes/alternativa/escolher", data),
}

export const adminService = {
  escalonar: () => api.post("/admin/escalonar"),
  pendentes: () => api.get("/alunos/admin/pendentes"),
  validar: (id) => api.patch(`/alunos/admin/${id}/validar`),
}

export default api
