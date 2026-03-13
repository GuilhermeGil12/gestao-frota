import { useState, useEffect } from "react";
import api from "../services/api";
import "../App.css";
import { toast } from "react-toastify";
import Swal from "sweetalert2";

function Cartoes() {
    // ==========================================
    // 1. ESTADOS
    // ==========================================
    const [funcionarios, setFuncionarios] = useState([]);
    const [termoBusca, setTermoBusca] = useState("");

    const [isModalCartoesOpen, setIsModalCartoesOpen] = useState(false);
    const [funcionarioSelecionado, setFuncionarioSelecionado] = useState(null);

    // Estado para guardar o código do crachá que está sendo digitado/lido
    const [novoUid, setNovoUid] = useState("");

    // ==========================================
    // 2. FUNÇÕES DE CARREGAMENTO
    // ==========================================
    const carregarFuncionarios = async () => {
        try {
            const res = await api.get('/funcionarios');
            setFuncionarios(res.data);

            // Se o modal estiver aberto, atualiza o funcionário selecionado em tempo real
            if (funcionarioSelecionado) {
                const atualizado = res.data.find(f => f.id === funcionarioSelecionado.id);
                setFuncionarioSelecionado(atualizado);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => { carregarFuncionarios(); }, []);

    const abrirPainelCartoes = (f) => {
        setFuncionarioSelecionado(f);
        setNovoUid(""); // Limpa o campo sempre que abrir um novo funcionário
        setIsModalCartoesOpen(true);
    };

    // ==========================================
    // 3. AÇÕES DOS CARTÕES (API)
    // ==========================================

    // CADASTRAR NOVO CARTÃO
    const handleVincularCartao = async () => {
        if (!novoUid.trim()) {
            return toast.warning("Digite ou aproxime o cartão no leitor RFID!");
        }

        try {
            const payload = {
                uid: novoUid.trim(),
                ativo: true,
                funcionario: { id: funcionarioSelecionado.id }
            };

            await api.post('/cartaorfid', payload);
            toast.success("Cartão vinculado com sucesso!");
            setNovoUid(""); // Limpa o input
            carregarFuncionarios(); // Atualiza a tela
        } catch (e) {
            toast.error("Erro ao vincular cartão. Talvez o código já exista?");
        }
    };

    // INATIVAR / ATIVAR CARTÃO
    const handleAlternarStatus = async (cartao) => {
        try {
            if (cartao.ativo) {
                // Se está ativo, inativa
                await api.patch(`/cartaorfid/${cartao.id}/inativar`);
                toast.success("Cartão Inativado!");
            } else {
                // Se está inativo, reativa
                await api.patch(`/cartaorfid/${cartao.id}/ativar`);
                toast.success("Cartão Reativado com sucesso!");
            }
            carregarFuncionarios(); // Atualiza a tela
        } catch (e) {
            toast.error("Erro ao mudar status do cartão.");
        }
    };

    // EXCLUIR CARTÃO
    const handleExcluirCartao = async (idCartao) => {
        const confirmacao = await Swal.fire({
            title: 'Remover Cartão?',
            text: "O funcionário perderá o acesso deste cartão permanentemente.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sim, remover',
            cancelButtonText: 'Cancelar',
            background: '#1e1e1e',
            color: '#ffffff',
            // Esse comando força o alerta a ficar na frente do Modal
            didOpen: () => {
                document.querySelector('.swal2-container').style.zIndex = '99999';
            }
        });

        if (confirmacao.isConfirmed) {
            try {
                await api.delete(`/cartaorfid/${idCartao}`);
                toast.success("Cartão removido!");
                carregarFuncionarios();
            } catch (e) {
                toast.error("Erro ao remover o cartão.");
            }
        }
    };

    // ==========================================
    // 4. FILTRO DE PESQUISA INTELIGENTE
    // ==========================================
    const buscaMinuscula = termoBusca.toLocaleLowerCase();

    const funcionariosFiltrados = funcionarios.filter((f) => {
        const nome = f.nome ? f.nome.toLocaleLowerCase() : "";
        const cpf = f.cpf ? f.cpf.toLocaleLowerCase() : "";

        // A Mágica: Verifica se o funcionário tem algum cartão e se o UID desse cartão bate com a busca
        const temCartaoBuscado = f.cartoes && f.cartoes.some(cartao =>
            cartao.uid && cartao.uid.toLocaleLowerCase().includes(buscaMinuscula)
        );

        // Retorna o funcionário se bater o Nome, o CPF OU o UID de algum cartão dele
        return nome.includes(buscaMinuscula) || cpf.includes(buscaMinuscula) || temCartaoBuscado;
    });

    return (
        <div className="conteudo-principal" style={{ alignItems: "stretch", width: "100%" }}>

            <div className="header-actions" style={{ maxWidth: "100%" }}>
                <h1>Vínculo de Cartões RFID</h1>
                <input
                    className="search-input"
                    type="text"
                    placeholder="Buscar por Nome, CPF ou Código do Crachá..."
                    value={termoBusca}
                    onChange={(e) => setTermoBusca(e.target.value)}
                    style={{ padding: "8px", borderRadius: "5px", border: "1px solid #ccc", minWidth: "350px" }}
                />
            </div>

            {/* ====================================================== */}
            {/* O MODAL DE CARTÕES                                     */}
            {/* ====================================================== */}
            {isModalCartoesOpen && funcionarioSelecionado && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: "850px" }}>
                        <div className="modal-header">
                            <h2>💳 Cartões de: <span style={{color: "#00d2ff"}}>{funcionarioSelecionado.nome}</span></h2>
                            <button className="btn-close" onClick={() => setIsModalCartoesOpen(false)}>&times;</button>
                        </div>

                        <div className="modal-body" style={{ display: "flex", gap: "30px", marginTop: "20px" }}>

                            {/* LADO ESQUERDO: LISTA DOS CARTÕES VINCULADOS */}
                            <div style={{ flex: "2" }}>
                                <h3 style={{ color: '#aaa', borderBottom: '1px solid #444', paddingBottom: '5px' }}>Cartões Vinculados</h3>

                                {(!funcionarioSelecionado.cartoes || funcionarioSelecionado.cartoes.length === 0) ? (
                                    <div style={{ background: "#1e1e1e", padding: "15px", borderRadius: "8px", textAlign: "center", color: "#888", marginTop: "15px" }}>
                                        Nenhum cartão vinculado no momento.
                                    </div>
                                ) : (
                                    <div style={{ marginTop: "15px", display: "flex", flexDirection: "column", gap: "10px", maxHeight: "300px", overflowY: "auto", paddingRight: "5px" }}>
                                        {funcionarioSelecionado.cartoes.map(cartao => (
                                            <div key={cartao.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#1a1a1a", padding: "12px", borderLeft: cartao.ativo ? "4px solid #00e676" : "4px solid #ff3d00", borderRadius: "6px" }}>
                                                <div>
                                                    <strong style={{ display: "block", color: "#fff", fontSize: "1.1rem", letterSpacing: "1px" }}>{cartao.uid}</strong>
                                                    <span style={{ fontSize: "0.8rem", color: cartao.ativo ? "#00e676" : "#ff3d00" }}>
                                                        {cartao.ativo ? "● ATIVO" : "● INATIVO"}
                                                    </span>
                                                </div>
                                                <div style={{ display: "flex", gap: "8px" }}>
                                                    {/* Botão de Inativar / Ativar */}
                                                    <button
                                                        onClick={() => handleAlternarStatus(cartao)}
                                                        style={{ background: cartao.ativo ? "#ff9800" : "#00e676", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem", width: "70px" }}
                                                    >
                                                        {cartao.ativo ? "Inativar" : "Ativar"}
                                                    </button>
                                                    {/* Botão de Excluir */}
                                                    <button
                                                        onClick={() => handleExcluirCartao(cartao.id)}
                                                        style={{ background: "#d33", color: "#fff", border: "none", padding: "6px 10px", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem" }}
                                                    >
                                                        Excluir
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* LADO DIREITO: CADASTRAR NOVO CARTÃO */}
                            <div style={{ flex: "1", background: "#1a1a1a", padding: "20px", borderRadius: "8px", border: "1px solid #333", height: "fit-content" }}>
                                <h3 style={{ color: '#00d2ff', marginTop: 0, marginBottom: "15px", fontSize: "1.1rem" }}>+ Novo Cartão</h3>

                                <label style={{ display: "block", color: "#ccc", marginBottom: "5px", fontSize: "0.9rem" }}>Código RFID (Passe o crachá)</label>
                                <input
                                    type="text"
                                    placeholder="Ex: A1B2C3D4"
                                    value={novoUid}
                                    onChange={(e) => setNovoUid(e.target.value.toUpperCase())}
                                    style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #444", background: "#222", color: "white", marginBottom: "15px" }}
                                />

                                <button className="save" onClick={handleVincularCartao} style={{ width: "100%", padding: "10px", fontSize: "1rem" }}>
                                    Vincular
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            )}

            {/* ====================================================== */}
            {/* TABELA DE FUNCIONÁRIOS                                 */}
            {/* ====================================================== */}
            <table style={{ maxWidth: "100%", marginTop: "20px" }}>
                <thead>
                <tr>
                    <th style={{ width: "30%" }}>Nome do Funcionário</th>
                    <th style={{ width: "20%" }}>CPF</th>
                    <th style={{ width: "20%" }}>Setor</th>
                    <th className="text-center" style={{ width: "30%" }}>Ação</th>
                </tr>
                </thead>
                <tbody>
                {(!Array.isArray(funcionariosFiltrados) || funcionariosFiltrados.length === 0) ? (
                    <tr>
                        <td colSpan="4" className="text-center" style={{ padding: "2rem", color: "#888" }}>
                            Nenhum funcionário encontrado.
                        </td>
                    </tr>
                ) : (
                    funcionariosFiltrados.map(f => (
                        <tr key={f.id}>
                            <td style={{ fontWeight: "600", color: "#fff" }}>{f.nome}</td>
                            <td>{f.cpf}</td>
                            <td style={{ textTransform: 'uppercase' }}>{f.setor}</td>
                            <td className="text-center">
                                <button
                                    className="save"
                                    onClick={() => abrirPainelCartoes(f)}
                                    style={{ padding: "6px 15px", fontSize: "0.9rem" }}
                                >
                                    Gerenciar Cartões
                                </button>
                            </td>
                        </tr>
                    ))
                )}
                </tbody>
            </table>
        </div>
    );
}

export default Cartoes;