import axios from 'axios';

const CHAVE_SESSAO = "sessao";

function lerSessao() {
    try {
        const bruto = localStorage.getItem(CHAVE_SESSAO);
        return bruto ? JSON.parse(bruto) : null;
    } catch {
        return null;
    }
}

function salvarSessao(sessao) {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
}

function limparSessao() {
    localStorage.removeItem(CHAVE_SESSAO);
}

const api = axios.create({
    baseURL: '/api'
});

api.interceptors.request.use((config) => {
    const sessao = lerSessao();
    if (sessao?.accessToken) {
        config.headers.Authorization = `Bearer ${sessao.accessToken}`;
    }
    return config;
});

// Enquanto um refresh está em andamento, as outras requisições esperam nesta fila
// em vez de dispararem refreshes concorrentes (que invalidariam uns aos outros).
let renovando = null;

api.interceptors.response.use(
    (res) => res,
    async (erro) => {
        const original = erro.config;
        const ehRotaDeAuth = original?.url?.includes("/auth/");

        if (erro.response?.status !== 401 || original?._jaTentou || ehRotaDeAuth) {
            return Promise.reject(erro);
        }

        const sessao = lerSessao();
        if (!sessao?.refreshToken) {
            limparSessao();
            window.location.href = "/login";
            return Promise.reject(erro);
        }

        original._jaTentou = true;

        try {
            if (!renovando) {
                renovando = axios
                    .post("/api/auth/refresh", { refreshToken: sessao.refreshToken })
                    .then((res) => {
                        salvarSessao(res.data);
                        return res.data.accessToken;
                    })
                    .finally(() => {
                        renovando = null;
                    });
            }

            const novoToken = await renovando;
            original.headers.Authorization = `Bearer ${novoToken}`;
            return api(original);
        } catch (falhaNoRefresh) {
            limparSessao();
            window.location.href = "/login";
            return Promise.reject(falhaNoRefresh);
        }
    }
);

export default api;
export { lerSessao, salvarSessao, limparSessao, CHAVE_SESSAO };
