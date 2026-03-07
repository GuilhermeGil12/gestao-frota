import { useState, useEffect } from 'react'
import api from './services/api' // O "telefone" que configuramos
import './App.css'
import Menu from './components/Menu' //menu

function App() {
    // 1. Criamos o estado para guardar os dados
    const [funcionarios, setFuncionarios] = useState([])



    // 2. Função que realmente faz a chamada ao Backend
    const carregarFuncionarios = async () => {
        try {
            const resposta = await api.get('/funcionarios') // Faz o GET na sua rota Java
            setFuncionarios(resposta.data) // Guarda o que o Java devolveu na nossa variável
        } catch (error) {
            console.error("Erro ao buscar funcionários:", error)
        }
    }

    // 3. O useEffect chama a função acima uma única vez ao carregar a página
    useEffect(() => {
        carregarFuncionarios()
    }, [])


    const [nome, setNome] = useState("");
    const [cpf, setCpf] = useState("");
    const [rg, setRg] = useState("");
    const [setor, setSetor] = useState("")
    const [nivelMotorista, setNivelMotorista] = useState("")

    const handleSalvar = async () =>{
        const novoFuncionario = {
            nome: nome,
            cpf: cpf,
            rg: rg,
            setor: setor,
            nivelMotorista: nivelMotorista,
        }

        try {
            await api.post('/funcionarios', novoFuncionario);

            alert("Funcionario cadastrado com sucesso!");

            //limpa o campo para o prox cadastrado
            setNome("")
            setCpf("")
            setRg("")
            setSetor("")
            setNivelMotorista("")


            carregarFuncionarios();
        }
        catch (error){
            console.error("Erro ao salvar", error);
        }
    }
    return (
        <div className="app-container"> {/* Container Pai */}
            <Menu /> {/* O componente que você criou */}

            <main className="conteudo-principal"> {/* Onde fica seu formulário e tabela */}


                <div className="formulario">
                    <label>Nome:</label>
                    <input
                        //oque vai dentro na textbox
                        placeholder="Digite o nome"
                        value={nome}
                        onChange={(e) => setNome(e.target.value)}
                    />
                    <label>CPF:</label>
                    <input
                        placeholder="Digite seu CPF"
                        value={cpf}
                        onChange={(e) =>setCpf(e.target.value)}
                    />
                    <label>RG:</label>
                    <input
                        placeholder="Digite seu RG"
                        value={rg}
                        onChange={(e) =>setRg(e.target.value)}
                    />

                    <label htmlFor="setor">Setor:</label>
                    <select
                        name="setor"
                        id="setor"
                        value={setor}
                        onChange={(e) => setSetor(e.target.value)} // Atualiza quando o usuário muda a opção
                    >
                        <option value="">Selecione um setor</option> {/* Opção vazia inicial */}
                        <option value="dev">DEV</option>
                        <option value="vendas">Vendas</option>
                        <option value="estoque">Estoque</option>
                        <option value="limpeza">Limpeza</option>
                        <option value="financeiro">Financeiro</option>
                        <option value="suporte">Suporte</option>
                    </select>

                    <label htmlFor="nivel_Motorista">Nível:</label>
                    <select
                        name="nivelMotorista"
                        id="nivelMotorista"
                        value={nivelMotorista}
                        onChange={(e) => setNivelMotorista(e.target.value)}
                    >
                        <option value="">Selecione o nível</option>
                        <option value="1">1</option>
                        <option value="2">2</option>
                        <option value="3">3</option>
                    </select>

                    <button className="save" onClick={handleSalvar}>Cadastrar</button>
                    <button className="exp">Exportar</button>

                </div>

                <table border="2" align="center">
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
                    {funcionarios.map(func =>(
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