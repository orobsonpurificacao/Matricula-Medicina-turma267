import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import Disciplinas from './pages/Disciplinas'
import Home from './pages/Home'
import Confirmacao from './pages/Confirmacao'
import Resultado from './pages/Resultado'
import Escalonamento from './pages/Escalonamento'
import Admin from './pages/Admin'

function RotaProtegida({ children }) {
  const aluno = localStorage.getItem('aluno')
  return aluno ? children : <Navigate to="/" replace />
}

function RotaProtegidaAdmin({ children }) {
  const raw = localStorage.getItem('aluno')
  if (!raw) return <Navigate to="/" replace />
  const aluno = JSON.parse(raw)
  return aluno.is_admin ? children : <Navigate to="/disciplinas" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/disciplinas" element={
          <RotaProtegida><Disciplinas /></RotaProtegida>
        } />
        <Route path="/home" element={
          <RotaProtegida><Home /></RotaProtegida>
        } />
        <Route path="/confirmacao" element={
          <RotaProtegida><Confirmacao /></RotaProtegida>
        } />
        <Route path="/resultado" element={
          <RotaProtegida><Resultado /></RotaProtegida>
        } />
        <Route path="/escalonamento" element={
          <RotaProtegida><Escalonamento /></RotaProtegida>
        } />
        <Route path="/admin" element={
          <RotaProtegidaAdmin><Admin /></RotaProtegidaAdmin>
        } />
      </Routes>
    </BrowserRouter>
  )
}
