import { useState, useEffect } from 'react'
import api from './services/api'
import './App.css'
import Menu from './components/Menu'

function App() {
    const [funcionarios, setFuncionarios] = useState([])
    const [nome, setNome] = useState("");
    const [cpf, setCpf] = useState("");
    const [rg, setRg] = useState("");
    const [setor, setSetor] = useState("")
    const [nivelMotorista, setNivelMotorista] = useState("")

    const carregarFuncionarios = async () => {
        try {
            const resposta = await api.get('/funcionarios')
            setFuncionarios(resposta.data)
        } catch (error) {
            console.error("Erro ao buscar funcionários:", error)
        }
    }

    useEffect(() => {
        carregarFuncionarios()
    }, [])

    const handleSalvar = async () => {
        const novoFuncionario = {
            nome,
            cpf,
            rg,
            setor,
            nivelMotorista,
        }

        try {
            await api.post('/funcionarios', novoFuncionario);
            alert("Funcionário cadastrado com sucesso!");

            // Limpa os campos
            setNome("")
            setCpf("")
            setRg("")
            setSetor("")
            setNivelMotorista("")

            carregarFuncionarios();
        } catch (error) {
            console.error("Erro ao salvar", error);
        }
    }

    return (
        <div className="app-container">
            <Menu />

            <main className="conteudo-principal">


                <div className="formulario">
                    <div className="input-group">
                        <label>Nome:</label>
                        <input
                            placeholder="Digite o nome"
                            value={nome}
                            onChange={(e) => setNome(e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label>CPF:</label>
                        <input
                            placeholder="000.000.000-00"
                            value={cpf}
                            onChange={(e) => setCpf(e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label>RG:</label>
                        <input
                            placeholder="Digite o RG"
                            value={rg}
                            onChange={(e) => setRg(e.target.value)}
                        />
                    </div>

                    <div className="input-group">
                        <label>Setor:</label>
                        <select value={setor} onChange={(e) => setSetor(e.target.value)}>
                            <option value="">Selecione um setor</option>
                            <option value="dev">DEV</option>
                            <option value="vendas">Vendas</option>
                            <option value="estoque">Estoque</option>
                            <option value="limpeza">Limpeza</option>
                            <option value="financeiro">Financeiro</option>
                            <option value="suporte">Suporte</option>
                        </select>
                    </div>

                    <div className="input-group">
                        <label>Nível:</label>
                        <select value={nivelMotorista} onChange={(e) => setNivelMotorista(e.target.value)}>
                            <option value="">Nível</option>
                            <option value="1">1</option>
                            <option value="2">2</option>
                            <option value="3">3</option>
                        </select>
                    </div>

                    <div className="button-group">
                        <button className="save" onClick={handleSalvar}>Cadastrar</button>
                        <button className="exp">Exportar</button>
                    </div>
                </div>

                <table>
                    <thead>
                    <tr>
                        <th>Nome</th>
                        <th>CPF</th>
                        <th>RG</th>
                        <th>Setor</th>
                        <th>Nível</th>
                    </tr>
                    </thead>
                    <tbody>
                    {funcionarios.map(func => (
                        <tr key={func.id}>
                            <td>{func.nome}</td>
                            <td>{func.cpf}</td>
                            <td>{func.rg}</td>
                            <td>{func.setor}</td>
                            <td>{func.nivelMotorista}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </main>
        </div>
    )
}

export default App