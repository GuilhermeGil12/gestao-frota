import { useState, useEffect } from "react";
import api from "../services/api";
import "../App.css";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import { maskCPF, maskRG } from '../utils/mascaras';

function Funcionarios() {
    // ==========================================
    // 1. ESTADOS (MEMÓRIA DO COMPONENTE)
    // ==========================================
    const [funcionarios, setFuncionarios] = useState([]);
    const [termoBusca, setTermoBusca] = useState("");

    // Controle do Modal de Cadastro/Edição
    const [isModalOpen, setIsModalOpen] = useState(false);

    // Controle do Modal de Visualização (Perfil)
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);

    const initialState = {
        id: null,
        nome: "",
        cpf: "",
        rg: "",
        numeroTelefone: "",
        email: "",
        matricula: "",
        cargo: "",
        setor: "",
        nivelMotorista: "",
        numCNH: "",
        categoriaCNH: "",
        validadeCNH: "",
        ativo: true
    };

    const [formData, setFormData] = useState(initialState);

    // ==========================================
    // 2. FUNÇÕES DO BANCO DE DADOS (API)
    // ==========================================
    const carregar = async () => {
        try {
            const res = await api.get('/funcionarios');
            setFuncionarios(res.data);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => { carregar(); }, []);

    const handleSalvar = async (e) => {
        e.preventDefault();
        try {
            if (formData.id) await api.put(`/funcionarios/${formData.id}`, formData);
            else await api.post('/funcionarios', formData);

            setIsModalOpen(false);
            carregar();
            toast.success("Funcionário salvo com sucesso!");
        } catch (e) {
            toast.error("Ops! Não foi possivel salvar este funcionário.");
        }
    };

    const handleExcluir = async (id) => {
        const confirmacao = await Swal.fire({
            title: 'Tem certeza?',
            text: "Deseja EXCLUIR permanentemente este funcionário?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar',
            background: '#1e1e1e',
            color: '#ffffff'
        });

        if (confirmacao.isConfirmed) {
            try {
                await api.delete(`/funcionarios/${id}`);
                carregar();
                toast.success("Funcionário excluido com sucesso!");
            } catch (e) {
                toast.error("Ops! Não foi possível excluir este funcionário.");
            }
        }
    };

    const abrirModal = (f = null) => {
        setFormData(f || initialState);
        setIsModalOpen(true);
    };

    const abrirModalVisualizacao = (f) => {
        setFuncionarioSelecionado(f);
        setIsViewModalOpen(true);
    };

    // ==========================================
    // 3. FILTRO DE PESQUISA
    // ==========================================
    const buscaMinuscula = termoBusca.toLocaleLowerCase();
    const funcionariosFiltrados = funcionarios.filter((f) => {
        const nome = f.nome ? f.nome.toLocaleLowerCase() : "";
        const cpf = f.cpf ? f.cpf.toLocaleLowerCase() : "";
        return nome.includes(buscaMinuscula) || cpf.includes(buscaMinuscula);
    });

    return (
        <div className="conteudo-principal" style={{ alignItems: "stretch", width: "100%" }}>

            <div className="header-actions" style={{ maxWidth: "100%" }}>
                <h1>Gestão de Funcionários</h1>
                <input
                    className="search-input"
                    type="text"
                    placeholder="Pesquisar por Nome ou CPF..."
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc", minWidth: "250px" }}
                />
                <button className="save" onClick={() => abrirModal()}>+ Novo Funcionário</button>
            </div>

            {/* ====================================================== */}
            {/* 1. MODAL DE CADASTRO E EDIÇÃO (850px)                  */}
            {/* ====================================================== */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: "850px" }}>
                        <div className="modal-header">
                            <h2>{formData.id ? "Editar Funcionário" : "Cadastrar Funcionário"}</h2>
                            <button className="btn-close" onClick={() => setIsModalOpen(false)}>&times;</button>
                        </div>

                        <form onSubmit={handleSalvar} className="modal-form">

                            {/* --- DADOS PESSOAIS --- */}
                            <h3 className="sessao-titulo" style={{ marginTop: 0, color: '#00d2ff', borderBottom: '1px solid #444', paddingBottom: '5px' }}>👤 Dados Pessoais</h3>
                            <div className="form-grid" style={{ gridTemplateColumns: "2fr 1fr 1fr", gap: "15px" }}>
                                <div className="input-container">
                                    <label>Nome Completo</label>
                                    <input value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} required />
                                </div>
                                <div className="input-container">
                                    <label>CPF</label>
                                    <input value={formData.cpf} onChange={e => setFormData({ ...formData, cpf: maskCPF(e.target.value) })} placeholder="000.000.000-00" required />
                                </div>
                                <div className="input-container">
                                    <label>RG</label>
                                    <input value={formData.rg} onChange={e => setFormData({ ...formData, rg: maskRG(e.target.value)})} required />
                                </div>
                            </div>
                            <div className="form-grid" style={{ gridTemplateColumns: "1fr 2fr", gap: "15px", marginTop: "15px" }}>
                                <div className="input-container">
                                    <label>Telefone</label>
                                    <input value={formData.numeroTelefone} onChange={e => setFormData({ ...formData, numeroTelefone: e.target.value })} placeholder="(17) 99999-9999" />
                                </div>
                                <div className="input-container">
                                    <label>E-mail</label>
                                    <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} placeholder="funcionario@empresa.com" />
                                </div>
                            </div>

                            {/* --- DADOS CORPORATIVOS --- */}
                            <h3 className="sessao-titulo" style={{ marginTop: '20px', color: '#00d2ff', borderBottom: '1px solid #444', paddingBottom: '5px' }}>🏢 Dados Corporativos</h3>
                            <div className="form-grid" style={{ gridTemplateColumns: "1fr 1.5fr 1fr 1fr", gap: "15px" }}>
                                <div className="input-container">
                                    <label>Matrícula</label>
                                    <input value={formData.matricula} onChange={e => setFormData({ ...formData, matricula: e.target.value })} placeholder="Ex: 107858" required />
                                </div>
                                <div className="input-container">
                                    <label>Cargo</label>
                                    <input value={formData.cargo} onChange={e => setFormData({ ...formData, cargo: e.target.value })} required />
                                </div>
                                <div className="input-container">
                                    <label>Setor</label>
                                    <select value={formData.setor} onChange={e => setFormData({ ...formData, setor: e.target.value })} required>
                                        <option value="">Selecione...</option>
                                        <option value="dev">DEV</option>
                                        <option value="vendas">Vendas</option>
                                        <option value="estoque">Estoque</option>
                                        <option value="financeiro">Financeiro</option>
                                    </select>
                                </div>
                                <div className="input-container">
                                    <label>Nível Motorista</label>
                                    <select value={formData.nivelMotorista} onChange={e => setFormData({ ...formData, nivelMotorista: e.target.value })} required>
                                        <option value="">Selecione...</option>
                                        <option value="1">1 (Básico)</option>
                                        <option value="2">2 (Intermediário)</option>
                                        <option value="3">3 (Avançado)</option>
                                    </select>
                                </div>
                            </div>

                            {/* --- DADOS DE DIREÇÃO --- */}
                            <h3 className="sessao-titulo" style={{ marginTop: '20px', color: '#00d2ff', borderBottom: '1px solid #444', paddingBottom: '5px' }}>🚗 Dados de Direção</h3>
                            <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr", gap: "15px" }}>
                                <div className="input-container">
                                    <label>Número CNH</label>
                                    <input value={formData.numCNH} onChange={e => setFormData({ ...formData, numCNH: e.target.value })} required />
                                </div>
                                <div className="input-container">
                                    <label>Categoria CNH</label>
                                    <select value={formData.categoriaCNH} onChange={e => setFormData({ ...formData, categoriaCNH: e.target.value })} required>
                                        <option value="">Selecione...</option>
                                        <option value="A">A</option>
                                        <option value="B">B</option>
                                        <option value="AB">AB</option>
                                        <option value="C">C</option>
                                        <option value="D">D</option>
                                        <option value="naopossui">Não possui</option>
                                    </select>
                                </div>
                                <div className="input-container">
                                    <label>Validade CNH</label>
                                    <input type="date" value={formData.validadeCNH} onChange={e => setFormData({ ...formData, validadeCNH: e.target.value })} />
                                </div>
                            </div>

                            <div className="modal-footer" style={{ marginTop: '30px' }}>
                                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancelar</button>
                                <button type="submit" className="save">Confirmar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ====================================================== */}
            {/* 2. MODAL DE VISUALIZAÇÃO BEM LARGO (1000px)            */}
            {/* ====================================================== */}
            {isViewModalOpen && funcionarioSelecionado && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: "1000px" }}> {/* BEM MAIS LARGO */}
                        <div className="modal-header">
                            <h2>Detalhes do Funcionário</h2>
                            <button className="btn-close" onClick={() => setIsViewModalOpen(false)}>&times;</button>
                        </div>

                        <div className="modal-body" style={{ color: "#eee", fontSize: "1.05rem" }}>

                            {/* Sessão 1 */}
                            <h3 style={{ color: '#00d2ff', borderBottom: '1px solid #444', paddingBottom: '5px', marginTop: 0 }}>👤 Dados Pessoais</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr 1fr", gap: "15px", marginBottom: "30px" }}>
                                <div><strong style={{color: '#888', display: 'block', fontSize: '0.85rem'}}>Nome Completo</strong> {funcionarioSelecionado.nome}</div>
                                <div><strong style={{color: '#888', display: 'block', fontSize: '0.85rem'}}>CPF</strong> {funcionarioSelecionado.cpf}</div>
                                <div><strong style={{color: '#888', display: 'block', fontSize: '0.85rem'}}>RG</strong> {funcionarioSelecionado.rg}</div>
                                <div><strong style={{color: '#888', display: 'block', fontSize: '0.85rem'}}>Telefone</strong> {funcionarioSelecionado.numeroTelefone || "Não informado"}</div>
                                <div style={{ gridColumn: "span 4" }}><strong style={{color: '#888', display: 'block', fontSize: '0.85rem'}}>E-mail</strong> {funcionarioSelecionado.email || "Não informado"}</div>
                            </div>

                            {/* Sessão 2 */}
                            <h3 style={{ color: '#00d2ff', borderBottom: '1px solid #444', paddingBottom: '5px' }}>🏢 Dados Corporativos</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "15px", marginBottom: "30px" }}>
                                <div><strong style={{color: '#888', display: 'block', fontSize: '0.85rem'}}>Matrícula</strong> {funcionarioSelecionado.matricula}</div>
                                <div><strong style={{color: '#888', display: 'block', fontSize: '0.85rem'}}>Cargo</strong> {funcionarioSelecionado.cargo}</div>
                                <div><strong style={{color: '#888', display: 'block', fontSize: '0.85rem'}}>Setor</strong> <span style={{ textTransform: "uppercase" }}>{funcionarioSelecionado.setor}</span></div>
                                <div><strong style={{color: '#888', display: 'block', fontSize: '0.85rem'}}>Nível Motorista</strong> {funcionarioSelecionado.nivelMotorista}</div>
                            </div>

                            {/* Sessão 3 */}
                            <h3 style={{ color: '#00d2ff', borderBottom: '1px solid #444', paddingBottom: '5px' }}>🚗 Dados de Direção</h3>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "15px", marginBottom: "10px" }}>
                                <div><strong style={{color: '#888', display: 'block', fontSize: '0.85rem'}}>Número CNH</strong> {funcionarioSelecionado.numCNH}</div>
                                <div><strong style={{color: '#888', display: 'block', fontSize: '0.85rem'}}>Categoria</strong> {funcionarioSelecionado.categoriaCNH}</div>
                                <div><strong style={{color: '#888', display: 'block', fontSize: '0.85rem'}}>Validade</strong> {funcionarioSelecionado.validadeCNH}</div>
                            </div>

                        </div>

                        <div className="modal-footer" style={{ marginTop: '30px' }}>
                            <button type="button" className="btn-cancel" onClick={() => setIsViewModalOpen(false)}>Fechar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====================================================== */}
            {/* 3. TABELA PRINCIPAL                                    */}
            {/* ====================================================== */}
            <table style={{ maxWidth: "100%", marginTop: "20px" }}>
                <thead>
                <tr>
                    <th style={{ width: "25%" }}>Nome</th>
                    <th style={{ width: "15%" }}>CPF</th>
                    <th style={{ width: "15%" }}>RG</th>
                    <th style={{ width: "15%" }}>Setor</th>
                    <th style={{ width: "10%" }}>Nível</th>
                    <th className="text-center" style={{ width: "20%" }}>Ações</th>
                </tr>
                </thead>
                <tbody>
                {(!Array.isArray(funcionariosFiltrados) || funcionariosFiltrados.length === 0) ? (
                    <tr>
                        <td colSpan="6" className="text-center" style={{ padding: "2rem", color: "#888" }}>
                            {termoBusca ? "Nenhum funcionário encontrado com esta pesquisa." : "Nenhum funcionário encontrado no banco."}
                        </td>
                    </tr>
                ) : (
                    funcionariosFiltrados.map(f => (
                        <tr key={f.id}>
                            {/* NOME AGORA É BRANCO E FICA AZUL NO HOVER */}
                            <td
                                onClick={() => abrirModalVisualizacao(f)}
                                style={{
                                    cursor: "pointer",
                                    color: "#ffffff",
                                    fontWeight: "600",
                                    transition: "color 0.2s ease-in-out"
                                }}
                                title="Clique para ver os detalhes"
                                onMouseOver={(e) => e.target.style.color = '#00d2ff'}
                                onMouseOut={(e) => e.target.style.color = '#ffffff'}
                            >
                                {f.nome}
                            </td>
                            <td>{f.cpf}</td>
                            <td>{f.rg}</td>
                            <td style={{ textTransform: 'uppercase' }}>{f.setor}</td>
                            <td>Nível {f.nivelMotorista}</td>
                            <td>
                                <div className="action-buttons">
                                    <button className="btn-edit" onClick={() => abrirModal(f)}>Editar</button>
                                    <button className="btn-delete" onClick={() => handleExcluir(f.id)}>Excluir</button>
                                </div>
                            </td>
                        </tr>
                    ))
                )}
                </tbody>
            </table>
        </div>
    );
}

export default Funcionarios;