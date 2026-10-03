import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import { LoginForm } from "@/components/login-form";


function Login() {
    const [email, setEmail] = useState("");
    const [senha, setSenha] = useState("");
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        return;
    }



    return (
        <div>
            <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
                <div className="w-full max-w-sm md:max-w-4xl">
                    <LoginForm 
                    email={email}
                    senha={senha}
                    setEmail={setEmail}
                    setSenha={setSenha}
                    handleLogin={handleLogin}
                    />
                </div>
            </div>
        </div>
    )
}

export default Login;