// src/utils/validacoes.js
//
// Cada função recebe o valor do campo e devolve:
//   - null            → o valor está certo;
//   - "mensagem"      → o que está errado, em pt-BR, para mostrar embaixo do campo.
//
// As mesmas regras existem no backend (util/Validacoes.java): o frontend avisa rápido,
// o backend garante (dá para burlar o navegador, não o servidor).

export const SENHA_MINIMA = 8;

const soDigitos = (v) => String(v ?? "").replace(/\D/g, "");
const vazio = (v) => String(v ?? "").trim() === "";

// ---------- Genéricos ----------

export const obrigatorio = (v, campo = "Este campo") =>
    vazio(v) ? `${campo} é obrigatório.` : null;

export const tamanho = (v, min, max, campo = "O campo") => {
    const t = String(v ?? "").trim().length;
    if (t < min) return `${campo} precisa ter pelo menos ${min} caracteres.`;
    if (max && t > max) return `${campo} pode ter no máximo ${max} caracteres.`;
    return null;
};

/** Junta as regras: devolve o primeiro erro encontrado. */
export const primeiroErro = (...erros) => erros.find(Boolean) ?? null;

/** Opcional: só valida se tiver algo digitado. */
export const sePreenchido = (v, regra) => (vazio(v) ? null : regra(v));

// ---------- Pessoa ----------

export const validarNomeCompleto = (v) => {
    if (vazio(v)) return "Nome é obrigatório.";
    const nome = v.trim();
    if (nome.length < 5) return "Nome muito curto.";
    if (nome.length > 120) return "Nome pode ter no máximo 120 caracteres.";
    if (/\d/.test(nome)) return "Nome não pode ter números.";
    if (nome.split(/\s+/).length < 2) return "Informe nome e sobrenome.";
    return null;
};

/** CPF: 11 dígitos e os 2 dígitos verificadores certos. */
export const validarCPF = (v) => {
    const cpf = soDigitos(v);
    if (cpf.length === 0) return "CPF é obrigatório.";
    if (cpf.length !== 11) return `CPF precisa ter 11 números (tem ${cpf.length}).`;
    if (/^(\d)\1{10}$/.test(cpf)) return "CPF inválido.";

    const digito = (base) => {
        let soma = 0;
        for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i);
        const resto = (soma * 10) % 11;
        return resto === 10 ? 0 : resto;
    };
    const d1 = digito(cpf.slice(0, 9));
    const d2 = digito(cpf.slice(0, 10));
    if (d1 !== Number(cpf[9]) || d2 !== Number(cpf[10])) return "CPF inválido (dígito verificador não confere).";
    return null;
};

/** RG: o formato muda por estado; aceita de 7 a 9 caracteres (o último pode ser X). */
export const validarRG = (v) => {
    const rg = String(v ?? "").replace(/[^0-9Xx]/g, "");
    if (rg.length === 0) return "RG é obrigatório.";
    if (!/^\d+[Xx]?$/.test(rg)) return "RG inválido: só números (o último pode ser X).";
    if (rg.length < 7 || rg.length > 9) return `RG precisa ter de 7 a 9 caracteres (tem ${rg.length}).`;
    return null;
};

/** Telefone com DDD: fixo (10 números) ou celular (11 números, começando com 9). */
export const validarTelefone = (v) => {
    const tel = soDigitos(v);
    if (tel.length === 0) return "Telefone é obrigatório.";
    if (tel.length !== 10 && tel.length !== 11) return "Telefone precisa ter DDD + número: (17) 99999-9999.";
    if (Number(tel.slice(0, 2)) < 11) return "DDD inválido.";
    if (tel.length === 11 && tel[2] !== "9") return "Celular precisa começar com 9 depois do DDD.";
    return null;
};

export const validarEmail = (v) => {
    if (vazio(v)) return "E-mail é obrigatório.";
    if (v.trim().length > 120) return "E-mail pode ter no máximo 120 caracteres.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return "E-mail inválido. Ex.: nome@empresa.com";
    return null;
};

export const validarCEP = (v) => {
    const cep = soDigitos(v);
    if (cep.length !== 8) return `CEP precisa ter 8 números (tem ${cep.length}).`;
    return null;
};

/** CNH: 11 números. */
export const validarCNH = (v) => {
    const cnh = soDigitos(v);
    if (cnh.length === 0) return "Número da CNH é obrigatório.";
    if (cnh.length !== 11) return `CNH precisa ter 11 números (tem ${cnh.length}).`;
    if (/^(\d)\1{10}$/.test(cnh)) return "CNH inválida.";
    return null;
};

/** Validade da CNH: data real e não absurda. Vencida é permitida (o sistema bloqueia o cartão). */
export const validarValidadeCNH = (v) => {
    if (vazio(v)) return "Validade da CNH é obrigatória.";
    const data = new Date(`${v}T00:00:00`);
    if (Number.isNaN(data.getTime())) return "Data inválida.";
    const ano = data.getFullYear();
    if (ano < 1980 || ano > new Date().getFullYear() + 15) return "Confira o ano da validade.";
    return null;
};

export const validarSenha = (v) => {
    if (vazio(v)) return "Senha é obrigatória.";
    if (v.length < SENHA_MINIMA) return `A senha precisa ter pelo menos ${SENHA_MINIMA} caracteres.`;
    if (v.length > 72) return "A senha pode ter no máximo 72 caracteres.";
    return null;
};

export const validarConfirmacaoSenha = (senha, confirmacao) => {
    if (vazio(confirmacao)) return "Confirme a senha.";
    if (senha !== confirmacao) return "As senhas não são iguais.";
    return null;
};

// ---------- Veículo ----------

/** Placa antiga (ABC-1234) ou Mercosul (ABC1D23). */
export const validarPlaca = (v) => {
    const placa = String(v ?? "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
    if (placa.length === 0) return "Placa é obrigatória.";
    if (placa.length !== 7) return `Placa precisa ter 7 caracteres (tem ${placa.length}).`;
    if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa)) return "Placa inválida. Use ABC-1234 ou ABC1D23 (Mercosul).";
    return null;
};

/** RENAVAM: 11 números com dígito verificador (os antigos, de 9, são completados com zeros à esquerda). */
export const validarRenavam = (v) => {
    let ren = soDigitos(v);
    if (ren.length === 0) return "RENAVAM é obrigatório.";
    if (ren.length !== 9 && ren.length !== 11) return `RENAVAM precisa ter 11 números (tem ${ren.length}).`;
    ren = ren.padStart(11, "0");
    const pesos = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const soma = pesos.reduce((acc, p, i) => acc + p * Number(ren[i]), 0);
    let dv = (soma * 10) % 11;
    if (dv === 10) dv = 0;
    if (dv !== Number(ren[10])) return "RENAVAM inválido (dígito verificador não confere).";
    return null;
};

export const validarVelocidadeMaxima = (v) => {
    if (vazio(v)) return null; // opcional: sem valor, vale o padrão de 110 km/h
    const n = Number(v);
    if (!Number.isInteger(n)) return "Use um número inteiro.";
    if (n < 20 || n > 200) return "O limite precisa estar entre 20 e 200 km/h.";
    return null;
};

/** Km do odômetro (opcional): sem valor, o sistema não conta a revisão. */
export const validarKm = (v) => {
    if (vazio(v)) return null;
    const n = Number(v);
    if (Number.isNaN(n) || n < 0 || n > 9999999) return "O km precisa estar entre 0 e 9.999.999.";
    return null;
};

/** Raio da cerca, em metros. */
export const validarRaio = (v) => {
    const n = Number(v);
    if (vazio(v) || Number.isNaN(n)) return "Raio é obrigatório.";
    if (n < 20 || n > 50000) return "O raio precisa estar entre 20 m e 50 km.";
    return null;
};

// ---------- Equipamentos ----------

/** IMEI do modem: 15 números com dígito verificador (algoritmo de Luhn). */
export const validarIMEI = (v) => {
    const imei = soDigitos(v);
    if (imei.length !== 15) return `IMEI precisa ter 15 números (tem ${imei.length}).`;
    let soma = 0;
    for (let i = 0; i < 15; i++) {
        let d = Number(imei[i]);
        if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
        soma += d;
    }
    if (soma % 10 !== 0) return "IMEI inválido (dígito verificador não confere).";
    return null;
};

export const validarMAC = (v) => {
    if (vazio(v)) return "Endereço MAC é obrigatório.";
    if (!/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/i.test(v.trim())) return "MAC inválido. Use 6 pares: 00:1B:44:11:3A:B7";
    return null;
};

/** UID do cartão RFID: 4, 7 ou 10 bytes em hexadecimal (8, 14 ou 20 caracteres). */
export const validarUID = (v) => {
    const uid = String(v ?? "").replace(/[\s:-]/g, "").toUpperCase();
    if (uid.length === 0) return "Código do cartão é obrigatório.";
    if (!/^[0-9A-F]+$/.test(uid)) return "O código do cartão só tem números e letras de A a F.";
    if (![8, 14, 20].includes(uid.length)) return `O código do cartão tem 8, 14 ou 20 caracteres (tem ${uid.length}).`;
    return null;
};
