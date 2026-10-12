import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { toast } from "sonner";
import { Toaster } from "sonner";
import { LoginForm } from "@/components/login-form";
import { useAuth } from "../context/AuthContext";

function Login() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const [carregando, setCarregando] = useState(false);
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
            toast.error(err?.response?.data?.message || "Não foi possível entrar.");
        } finally {
            setCarregando(false);
        }
    };

    return (
        <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
            <div className="w-full max-w-sm md:max-w-4xl">
                <LoginForm
                    email={email}
                    senha={senha}
                    setEmail={setEmail}
                    setSenha={setSenha}
                    handleLogin={handleLogin}
                    carregando={carregando}
                />
            </div>
            <Toaster theme="dark" richColors position="bottom-center" />
        </div>
    );
}

export default Login;
