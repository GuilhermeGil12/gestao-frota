import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Toaster } from "sonner";
import { LoginForm } from "@/components/login-form";
import FundoCidade from "@/components/FundoCidade";
import { useAuth } from "../context/AuthContext";

function Login() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [carregando, setCarregando] = useState(false);
    const [erro, setErro] = useState(false);
    const { login, autenticado } = useAuth();
    const navigate = useNavigate();

    if (autenticado) return <Navigate to="/dashboard" replace />;

    const handleLogin = async (e) => {
        e.preventDefault();
        setCarregando(true);
        try {
            await login(email, senha);
            navigate("/dashboard", { replace: true });
        } catch (err) {
            setErro(true);
            toast.error(err?.response?.data?.message || "Não foi possível entrar. Confira o e-mail e a senha.");
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background p-6 md:p-10">
            <FundoCidade />
            <div className="relative z-10 w-full max-w-md">
                <LoginForm
                    email={email}
                    senha={senha}
                    setEmail={setEmail}
                    setSenha={setSenha}
                    handleLogin={handleLogin}
                    carregando={carregando}
                    erro={erro}
                    aoFimDoErro={() => setErro(false)}
                />
            </div>
            <Toaster theme="dark" richColors position="bottom-center" />
        </div>
    );
}

export default Login;
