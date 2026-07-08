import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Cadastro from './pages/Cadastro'
import Disciplinas from './pages/Disciplinas'
import Confirmacao from './pages/Confirmacao'
import Resultado from './pages/Resultado'
import Admin from './pages/Admin'

function RotaProtegida({ children }) {
  const aluno = localStorage.getItem('aluno')
  return aluno ? children : <Navigate to="/" replace />
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
        <Route path="/confirmacao" element={
          <RotaProtegida><Confirmacao /></RotaProtegida>
        } />
        <Route path="/resultado" element={
          <RotaProtegida><Resultado /></RotaProtegida>
        } />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}
