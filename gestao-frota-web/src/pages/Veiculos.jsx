import { useState, useEffect } from "react";
import api from "../services/api";
import "../App.css";
import { toast } from "react-toastify";
import Swal from "sweetalert2";
import {maskCPF, maskPlaca, maskRG} from '../utils/mascaras';

function Veiculos() {
    const [veiculos, setVeiculos] = useState([]);
    const [controladorasLivres, setControladorasLivres] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // 1. O Estado da busca continua aqui em cima!
    const [termoBusca, setTermoBusca] = useState("");

    const initialState = { id: null, nome: "", placa: "", renavam: "", kmAtual: "", velocidadeMaxima: "", ativo: true, controladoraId: "" };
    const [formData, setFormData] = useState(initialState);

    const carregarDados = async () => {
        try {
            const resVeiculos = await api.get('/veiculos');
            if (Array.isArray(resVeiculos.data)) {
                setVeiculos(resVeiculos.data);
            } else {
                console.error("🚨 O Java não mandou lista de Veículos:", resVeiculos.data);
                setVeiculos([]);
            }

            const resControladoras = await api.get('/controladora');
            if (Array.isArray(resControladoras.data)) {
                setControladorasLivres(resControladoras.data);
            } else {
                console.error("🚨 O Java não mandou lista de Controladoras:", resControladoras.data);
                setControladorasLivres([]);
            }
        } catch (e) { console.error(e); }
    };

    useEffect(() => { carregarDados(); }, []);

    const handleSalvar = async (e) => {
        // ... (seu código de salvar continua igual)
        e.preventDefault();
        try {
            const payload = { ...formData };
            if (payload.controladoraId) {
                payload.controladora = { idControladora: payload.controladoraId };
            } else {
                payload.controladora = null;
            }

            if (formData.id) await api.put(`/veiculos/${formData.id}`, payload);
            else await api.post('/veiculos', payload);

            setIsModalOpen(false);
            carregarDados();
            toast.success("Veículo salvo com sucesso!");
        } catch (e) { toast.error("Ops! Não foi possível salvar este veículo"); }
    };

    const handleInativar = async (veiculo) => {
        // ... (seu código de inativar continua igual)
        const confirmacao = await Swal.fire({
            title: 'Tem certeza?',
            text: "Deseja alterar o status deste veículo?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim!',
            cancelButtonText: 'Cancelar',
            background: '#1e1e1e',
            color: '#ffffff'
        });
        if(confirmacao.isConfirmed){
            try{
                await api.put(`/veiculos/${veiculo.id}`, { ...veiculo, ativo: !veiculo.ativo });
                carregarDados();
                toast.success("Status alterado com sucesso!");
            }catch (e) {
                toast.error("Ops! Não foi possível alterar este veículo.");
            }
        }
    }

    const handleExcluir = async (id) => {
        // ... (seu código de excluir continua igual)
        const confirmacao = await Swal.fire({
            title: 'Tem certeza?',
            text: "Deseja EXCLUIR permanentemente este veículo?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar',
            background: '#1e1e1e',
            color: '#ffffff'
        });
        if(confirmacao.isConfirmed){
            try{
                await api.delete(`/veiculos/${id}`);
                carregarDados();
                toast.success("Veículo excluido com sucesso");
            }catch (e) {
                toast.error("Ops! Não foi possível excluir este veículo.");
            }
        }
    }

    const abrirModal = (v = null) => {
        if(v) {
            setFormData({...v, controladoraId: v.controladora ? v.controladora.idControladora : ""});
        } else {
            setFormData(initialState);
        }
        setIsModalOpen(true);
    };

    // =========================================================================
    // 2. A MÁGICA DA BUSCA FICA AQUI (logo antes do return)!
    // Ele recalcula toda vez que a tela atualiza (ou seja, quando o usuário digita)
    // =========================================================================
    const buscaMinuscula = termoBusca.toLocaleLowerCase();

    const veiculosFiltrados = veiculos.filter((v) => {
        const placa = v.placa ? v.placa.toLowerCase() : "";
        const nome = v.nome ? v.nome.toLowerCase() : "";
        return placa.includes(buscaMinuscula) || nome.includes(buscaMinuscula);
    });

    return (
        <div className="conteudo-principal" style={{ alignItems: "stretch", width: "100%" }}>
            <div className="header-actions" style={{ maxWidth: "100%" }}>
                <h1>Gestão de Veículos</h1>

                {/* O input de pesquisa */}
                <input className="search-input"
                    type="text"
                    placeholder="Pesquisar por Nome ou Placa..."
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc", minWidth: "250px" }}
                />

                <button className="save" onClick={() => abrirModal()}>+ Novo Veículo</button>
            </div>


            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{formData.id ? "Editar Veículo" : "Cadastrar Veículo"}</h2>
                            <button className="btn-close" onClick={() => setIsModalOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSalvar} className="modal-form">
                            <div className="input-container">
                                <label>Nome do Veículo</label>
                                <input value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} required />
                            </div>

                            <div className="form-grid">
                                <div className="input-container">
                                    <label>Placa</label>
                                    <input value={formData.placa} onChange={e => setFormData({...formData, placa: maskPlaca(e.target.value)})} required />
                                </div>
                                <div className="input-container">
                                    <label>Renavam</label>
                                    <input value={formData.renavam} onChange={e => setFormData({...formData, renavam: e.target.value})} required />
                                </div>
                            </div>

                            <div className="form-grid">
                                <div className="input-container">
                                    <label>Vel. Máxima (km/h)</label>
                                    <input type="number" value={formData.velocidadeMaxima} onChange={e => setFormData({...formData, velocidadeMaxima: e.target.value})} />
                                </div>
                                <div className="input-container">
                                    <label>Vincular Controladora</label>
                                    <select value={formData.controladoraId} onChange={e => setFormData({...formData, controladoraId: e.target.value})}>
                                        <option value="">Nenhuma / Sem Rastreador</option>
                                        {Array.isArray(controladorasLivres) && controladorasLivres.map(c => (
                                            <option key={c.idControladora} value={c.idControladora}>
                                                ID: {c.idControladora} - IP: {c.ipControladora}
                                            </option>
                                        ))}
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

            <table style={{ maxWidth: "100%", marginTop: "20px" }}>
                <thead>
                <tr>
                    <th style={{ width: "10%" }}>Status</th>
                    <th style={{ width: "20%" }}>Nome</th>
                    <th style={{ width: "15%" }}>Placa</th>
                    <th style={{ width: "15%" }}>Renavam</th>
                    <th style={{ width: "20%" }}>Controladora</th>
                    <th className="text-center" style={{ width: "20%" }}>Ações</th>
                </tr>
                </thead>
                <tbody>

                {/* TABELA LENDO OS VEÍCULOS FILTRADOS */}
                {(!Array.isArray(veiculosFiltrados) || veiculosFiltrados.length === 0) ? (
                    <tr>
                        <td colSpan="6" className="text-center" style={{padding: "2rem", color: "#888"}}>
                            {termoBusca ? "Nenhum veículo encontrado com esta pesquisa." : "Nenhum veículo encontrado no banco."}
                        </td>
                    </tr>
                ) : (
                    veiculosFiltrados.map(v => (
                        <tr key={v.id}>
                            <td><span className={v.ativo ? "status-ativo" : "status-inativo"}>{v.ativo ? "● Ativo" : "● Inativo"}</span></td>
                            <td>{v.nome}</td>
                            <td style={{ textTransform: "uppercase" }}>{v.placa}</td>
                            <td>{v.renavam}</td>
                            <td>{v.controladora ? `IP: ${v.controladora.ipControladora}` : "Desvinculado"}</td>
                            <td>
                                <div className="action-buttons">
                                    <button className="btn-edit" onClick={() => abrirModal(v)}>Editar</button>
                                    <button className="btn-inativar" onClick={() => handleInativar(v)}>
                                        {v.ativo ? "Inativar" : "Ativar"}
                                    </button>
                                    <button className="btn-delete" onClick={() => handleExcluir(v.id)}>Excluir</button>
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

export default Veiculos;