// src/utils/mascaras.js

// 1. Máscara de CPF: 000.000.000-00
export const maskCPF = (value) => {
    return value
        .replace(/\D/g, "") // Remove tudo que não é número
        .replace(/(\d{3})(\d)/, "$1.$2") // Coloca ponto após os primeiros 3 dígitos
        .replace(/(\d{3})(\d)/, "$1.$2") // Coloca ponto após os segundos 3 dígitos
        .replace(/(\d{3})(\d{1,2})/, "$1-$2") // Coloca hífen antes dos últimos 2 dígitos
        .replace(/(-\d{2})\d+?$/, "$1"); // Impede de digitar mais que 11 números
};

// 2. Máscara de RG (Padrão SP: 00.000.000-0)
export const maskRG = (value) => {
    return value
        .replace(/[^a-zA-Z0-9]/g, "") // Permite números e a letra X
        .toUpperCase()
        .replace(/(\d{2})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})([a-zA-Z0-9]{1,2})/, "$1-$2")
        .substring(0, 12); // Limita o tamanho
};

// 3. Máscara de Placa (Serve para Antiga ABC-1234 e Mercosul ABC-1D23)
export const maskPlaca = (value) => {
    return value
        .replace(/[^a-zA-Z0-9]/g, "") // Permite só letras e números
        .toUpperCase() // Força ficar tudo maiúsculo
        .replace(/^([A-Z]{3})(\d)/, "$1-$2") // Coloca o hífen depois das 3 primeiras letras
        .substring(0, 8); // Limita a 8 caracteres (ABC-1234)
};

// 4. Máscara de MAC Address: 00:1A:2B:3C:4D:5E
export const maskMAC = (value) => {
    return value
        .replace(/[^a-fA-F0-9]/g, "") // Permite só Hexadecimal (0-9, A-F)
        .toUpperCase()
        .replace(/(\w{2})(\w)/, "$1:$2")
        .replace(/(\w{2})(\w)/, "$1:$2")
        .replace(/(\w{2})(\w)/, "$1:$2")
        .replace(/(\w{2})(\w)/, "$1:$2")
        .replace(/(\w{2})(\w)/, "$1:$2")
        .substring(0, 17); // Limita o tamanho
};

// 5. Máscara de IP (Permite apenas números e pontos, ex: 192.168.0.1)
export const maskIP = (value) => {
    return value
        .replace(/[^0-9.]/g, "") // Permite apenas números e o ponto
        .replace(/(\..*?)\./g, "$1.") // Evita pontos duplos seguidos
        .substring(0, 15); // Tamanho máximo de um IPv4 (255.255.255.255)
};