import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';


// Importação do Menu (que fica fixo na lateral)
import Menu from './components/Menu';

// Importação de todas as suas Telas (Páginas)
import Dashboard from './pages/Dashboard';
import Funcionarios from './pages/Funcionarios';
import Veiculos from './pages/Veiculos';
import Controladoras from './pages/Controladoras';

function App() {
    return (
        <Router>
            <div className="app-container">
                {/* O Menu fica aqui fora para não recarregar quando mudarmos de tela */}
                <Menu />

                {/* O main envolve as telas e aplica aquele fundo preto absoluto */}
                <main className="conteudo-principal">
                    <Routes>
                        {/* Rota do Dashboard (Tela Inicial com os cards) */}
                        <Route path="/dashboard" element={<Dashboard />} />

                        {/* Rotas dos Cadastros */}
                        <Route path="/funcionarios" element={<Funcionarios />} />
                        <Route path="/veiculos" element={<Veiculos />} />
                        <Route path="/controladoras" element={<Controladoras />} />

                        {/* Se o usuário entrar só em "localhost:5173/", joga ele direto pro Dashboard */}
                        <Route path="/" element={<Navigate to="/dashboard" />} />
                    </Routes>
                </main>

                <ToastContainer autoClose={3000} theme="colored" />
            </div>
        </Router>
    );
}

export default App;