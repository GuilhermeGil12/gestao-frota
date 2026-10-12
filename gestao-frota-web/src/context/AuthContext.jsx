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
