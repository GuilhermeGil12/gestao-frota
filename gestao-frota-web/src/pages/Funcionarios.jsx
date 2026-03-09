import { useState, useEffect } from "react";
import api from "../services/api";
import "../App.css";
import {toast} from "react-toastify";
import Swal from "sweetalert2";

function Funcionarios() {
    const [funcionarios, setFuncionarios] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [termoBusca , setTermoBusca] = useState("");

    const initialState = { id: null, nome: "", cpf: "", rg: "", setor: "", nivelMotorista: "" };
    const [formData, setFormData] = useState(initialState);

    const carregar = async () => {
        try { const res = await api.get('/funcionarios'); setFuncionarios(res.data); }
        catch (e) { console.error(e); }
    };

    useEffect(() => { carregar(); }, []);

    const handleSalvar = async (e) => {
        e.preventDefault();
        try {
            if (formData.id) await api.put(`/funcionarios/${formData.id}`, formData);
            else await api.post('/funcionarios', formData);
            setIsModalOpen(false);
            carregar();
            toast.success("Funcionário salvo com sucesso");
        } catch (e) {toast.error("Ops! Não foi possivel salvar este funcionário") }
    };

    const handleExcluir = async (id) => {
        const confirmacao = await Swal.fire({
            title: 'Tem certeza?',
            text: "Deseja EXCLUIR permanentemente este funcionário?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',   // Botão de confirmar vermelho (padrão para exclusão)
            cancelButtonColor: '#3085d6', // Botão de cancelar azul
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar',
            background: '#1e1e1e',
            color: '#ffffff'
        });

        if(confirmacao.isConfirmed){
            try{
                await api.delete(`/funcionarios/${id}`);
                carregar();
                toast.success("Funcionário excluido com sucesso");
            }catch (e) {
                toast.error("Ops! Não foi possível excluir este funcionário.");
            }

        }
    }
    const abrirModal = (f = null) => { setFormData(f || initialState); setIsModalOpen(true); };

    const buscaMinuscula = termoBusca.toLocaleLowerCase();

    const funcionariosFiltrados = funcionarios.filter((f) => {
        const nome = f.nome ? f.nome.toLocaleLowerCase() : "";
        const cpf = f.cpf ? f.cpf.toLocaleLowerCase() : "";
        return nome.includes(buscaMinuscula) || cpf.includes(buscaMinuscula);
    });

    return (
        <>
            <div className="header-actions">
                <h1>Gestão de Funcionários</h1>

                <input className="search-input"
                       type="text"
                       placeholder="Pesquisar por Nome ou CPF..."
                       value={termoBusca}
                       onChange={(e) => setTermoBusca(e.target.value)}
                       style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc", minWidth: "250px" }}
                />
                <button className="save" onClick={() => abrirModal()}>+ Novo Funcionário</button>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{formData.id ? "Editar Funcionário" : "Cadastrar Funcionário"}</h2>
                            <button className="btn-close" onClick={() => setIsModalOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSalvar} className="modal-form">
                            <div className="input-container">
                                <label>Nome Completo</label>
                                <input value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                            </div>
                            <div className="form-grid">
                                <div className="input-container">
                                    <label>CPF</label>
                                    <input value={formData.cpf} onChange={e => setFormData({...formData, cpf: e.target.value})} placeholder="000.000.000-00" required />
                                </div>
                                <div className="input-container">
                                    <label>RG</label>
                                    <input value={formData.rg} onChange={e => setFormData({...formData, rg: e.target.value})} required />
                                </div>
                            </div>
                            <div className="form-grid">
                                <div className="input-container">
                                    <label>Setor</label>
                                    <select value={formData.setor} onChange={e => setFormData({...formData, setor: e.target.value})}>
                                        <option value="">Selecione...</option>
                                        <option value="dev">DEV</option>
                                        <option value="vendas">Vendas</option>
                                        <option value="estoque">Estoque</option>
                                        <option value="financeiro">Financeiro</option>
                                    </select>
                                </div>
                                <div className="input-container">
                                    <label>Nível Motorista</label>
                                    <select value={formData.nivelMotorista} onChange={e => setFormData({...formData, nivelMotorista: e.target.value})}>
                                        <option value="">Selecione...</option>
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="save">Confirmar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <table>
                <thead>
                <tr>
                    <th>Nome</th>
                    <th>CPF</th>
                    <th>RG</th>
                    <th>Setor</th>
                    <th>Nível</th>
                    <th className="text-center">Ações</th>
                </tr>
                </thead>
                <tbody>
                {(!Array.isArray(funcionariosFiltrados) || funcionariosFiltrados.length === 0) ? (
                    <tr>
                        <td colSpan="6" className="text-center" style={{padding: "2rem", color: "#888"}}>
                            {termoBusca ? "Nenhum funcionário encontrado com esta pesquisa." : "Nenhum funcionário encontrado no banco."}
                        </td>
                    </tr>
                ) : (
                funcionariosFiltrados.map(f => (
                    <tr key={f.id}>
                        <td>{f.nome}</td>
                        <td>{f.cpf}</td>
                        <td>{f.rg}</td>
                        <td style={{textTransform: 'uppercase'}}>{f.setor}</td>
                        <td>Nível {f.nivelMotorista}</td>
                        <td className="text-center">
                            <button className="btn-edit" onClick={() => abrirModal(f)}>Editar</button>
                            <button className="btn-delete" onClick={() => handleExcluir(f.id)}>Excluir</button>
                        </td>
                    </tr>
                )))}
                </tbody>
            </table>
        </>
    );
}

export default Funcionarios;