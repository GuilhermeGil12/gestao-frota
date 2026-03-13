import { useState, useEffect } from "react";
import api from "../services/api";
import "../App.css";
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import {maskIP, maskMAC} from "../utils/mascaras.js";

function Controladoras() {
    const [controladoras, setControladoras] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const initialState = { idControladora: null, ipControladora: "", macControladora: "", senha: "", ativo: true };
    const [formData, setFormData] = useState(initialState);

    const carregar = async () => {
        try {
            const res = await api.get('/controladora');

            // TRAVA DE SEGURANÇA
            if (Array.isArray(res.data)) {
                setControladoras(res.data);
            } else {
                console.error("🚨 O Java não mandou uma lista de Controladoras! Ele mandou isto:", res.data);
                setControladoras([]);
            }
        } catch (e) {
            console.error("Erro na requisição:", e);
            setControladoras([]);
        }
    };

    useEffect(() => { carregar(); }, []);

    const handleSalvar = async (e) => {
        e.preventDefault();
        try {
            if (formData.idControladora) {
                await api.put(`/controladora/${formData.idControladora}`, formData);
            } else {
                await api.post('/controladora', formData);
            }
            setIsModalOpen(false);
            carregar();
            toast.success("Controladora salva com sucesso!");
        } catch (e) {toast.error("Erro ao salvar. Verifique se o IP ou MAC já existem!") }
    };

    const handleInativar = async (controladora) => {
        const isAtivo = controladora.ativo;
        const acao = isAtivo ? "INATIVAR" : "ATIVAR";
        const confirmacao = await Swal.fire({
            title: 'Tem certeza?',
            text: `Deseja ${acao} esta controladora?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: isAtivo ? '#d33' : '#28a745',   // Vermelho para inativar, Verde para ativar
            cancelButtonColor: '#3085d6', // Botão de cancelar azul
            confirmButtonText: `Sim, ${acao}!`,
            cancelButtonText: 'Cancelar',
            background: '#1e1e1e',
            color: '#ffffff'
        });
        if(confirmacao.isConfirmed){
            try{
                await api.patch(`/controladora/${controladora.idControladora}/inativar`);
                carregar(); // Corrigido de carregarDados() para carregar()
                toast.success(`Controladora ${isAtivo ? 'inativada' : 'ativada'} com sucesso`);
            }catch (e) {
                toast.error("Ops! Não foi possível alterar o status desta controladora.");
            }

        }
    }

    // Não esqueça de colocar isso lá no topo do arquivo junto com os outros imports!
// import Swal from 'sweetalert2';

    const handleExcluir = async (idControladora) => {

        // 1. Dispara o modal bonitão do SweetAlert e "espera" a resposta
        const confirmacao = await Swal.fire({
            title: 'Tem certeza?',
            text: "Deseja EXCLUIR permanentemente esta controladora?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',   // Botão de confirmar vermelho (padrão para exclusão)
            cancelButtonColor: '#3085d6', // Botão de cancelar azul
            confirmButtonText: 'Sim, excluir!',
            cancelButtonText: 'Cancelar',
            background: '#1e1e1e',
            color: '#ffffff'
        });

        // 2. O SweetAlert retorna um objeto. Se a pessoa clicou no "Sim", o isConfirmed vem como true
        if (confirmacao.isConfirmed) {
            try {
                await api.delete(`/controladora/${idControladora}`);
                carregar();

                // Mantemos o seu Toast aqui porque fica super moderno!
                // (A tela escurece pro Modal de pergunta, depois some e pula o toast de sucesso)
                toast.success("Controladora excluída com sucesso!");

            } catch (e) {
                toast.error("Ops! Não foi possível excluir esta controladora.");
            }
        }
    };

    const abrirModal = (c = null) => { setFormData(c || initialState); setIsModalOpen(true); };

    return (
        <div className="conteudo-principal" style={{ alignItems: "stretch", width: "100%" }}>
            <div className="header-actions" style={{ maxWidth: "100%" }}>
                <h1>Gestão de Controladoras</h1>
                <button className="save" onClick={() => abrirModal()}>+ Nova Controladora</button>
            </div>

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h2>{formData.idControladora ? "Editar Controladora" : "Cadastrar Controladora"}</h2>
                            <button className="btn-close" onClick={() => setIsModalOpen(false)}>&times;</button>
                        </div>
                        <form onSubmit={handleSalvar} className="modal-form">
                            <div className="input-container">
                                <label>Endereço IP</label>
                                <input placeholder="192.168.0.1" value={formData.ipControladora} onChange={e => setFormData({...formData, ipControladora: maskIP(e.target.value)})} required />
                            </div>
                            <div className="form-grid">
                                <div className="input-container">
                                    <label>Endereço MAC</label>
                                    <input placeholder="00:1B:44:11:3A:B7" value={formData.macControladora} onChange={e => setFormData({...formData, macControladora: maskMAC(e.target.value)})} required />
                                </div>
                                <div className="input-container">
                                    <label>Senha</label>
                                    <input type="password" placeholder="Senha do equipamento" value={formData.senha} onChange={e => setFormData({...formData, senha: e.target.value})} required />
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

            <table style={{ maxWidth: "100%" }}>
                <thead>
                <tr>
                    <th style={{width: "10%"}}>Status</th>
                    <th style={{width: "15%"}}>ID Banco</th>
                    <th style={{width: "25%"}}>IP Controladora</th>
                    <th style={{width: "25%"}}>MAC Controladora</th>
                    <th className="text-center" style={{width: "25%"}}>Ações</th>
                </tr>
                </thead>
                <tbody>
                {(!Array.isArray(controladoras) || controladoras.length === 0) ? (
                    <tr><td colSpan="5" className="text-center" style={{padding: "2rem", color: "#888"}}>Nenhuma controladora encontrada no banco.</td></tr>
                ) : (
                    controladoras.map(c => (
                        <tr key={c.idControladora}>
                            <td><span className={c.ativo ? "status-ativo" : "status-inativo"}>{c.ativo ? "● Ativo" : "● Inativo"}</span></td>
                            <td>#{c.idControladora}</td>
                            <td>{c.ipControladora}</td>
                            <td>{c.macControladora}</td>
                            <td>
                                <div className="action-buttons">
                                    <button className="btn-edit" onClick={() => abrirModal(c)}>Editar</button>
                                    <button 
                                        className={c.ativo ? "btn-inativar" : "btn-ativar"} 
                                        style={{ backgroundColor: c.ativo ? "#dc3545" : "#28a745" }}
                                        onClick={() => handleInativar(c)}
                                    >
                                        {c.ativo ? "Inativar" : "Ativar"}
                                    </button>
                                    <button className="btn-delete" onClick={() => handleExcluir(c.idControladora)}>Excluir</button>
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

export default Controladoras;