import { createContext, useContext, useState } from "react";
import api, { lerSessao, salvarSessao, limparSessao } from "../services/api";

const AuthContext = createContext();

function AuthProvider({ children }) {
    const [sessao, setSessao] = useState(lerSessao);

    const login = async (email, senha) => {
        const res = await api.post("/auth/login", { email, senha });
        salvarSessao(res.data);
        setSessao(res.data);
        return res.data;
    };

    const logout = async () => {
        const atual = lerSessao();
        try {
            if (atual?.refreshToken) {
                await api.post("/auth/logout", { refreshToken: atual.refreshToken });
            }
        } catch {
            // Sessão já inválida no servidor: encerrar localmente basta.
        }
        limparSessao();
        setSessao(null);
    };

    // Atualiza dados do usuário na sessão (ex.: nome e foto trocados no Perfil) sem novo login.
    const atualizarUsuario = (campos) => {
        const atual = lerSessao();
        if (!atual?.usuario) return;
        const nova = { ...atual, usuario: { ...atual.usuario, ...campos } };
        try {
            salvarSessao(nova);
        } catch {
            // localStorage cheio: a tela atualiza mesmo assim, só não lembra depois de recarregar
        }
        setSessao(nova);
    };

    const usuario = sessao?.usuario ?? null;
    const permissoes = usuario?.permissoes ?? [];

    const temPermissao = (chave) => {
        if (!usuario) return false;
        if (!chave) return true;
        return permissoes.includes(chave);
    };

    const temAlgumaPermissao = (chaves = []) => {
        if (chaves.length === 0) return true;
        return chaves.some((c) => permissoes.includes(c));
    };

    return (
        <AuthContext.Provider
            value={{
                usuario,
                autenticado: Boolean(usuario),
                login,
                logout,
                atualizarUsuario,
                temPermissao,
                temAlgumaPermissao,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

function useAuth() {
    return useContext(AuthContext);
}

export { AuthContext, AuthProvider, useAuth };
