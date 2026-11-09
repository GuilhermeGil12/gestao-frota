// Tira acentos e deixa minúsculo: "João" → "joao".
export function normalizar(texto) {
    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .trim();
}

function soDigitos(texto) {
    return String(texto ?? "").replace(/\D/g, "");
}

/**
 * true se o termo aparece em algum dos campos.
 * - Texto: ignora maiúsculas e acentos ("joao" acha "João").
 * - Números: ignora a máscara ("12345678900" acha "123.456.789-00").
 */
export function combinaBusca(termo, campos) {
    const texto = normalizar(termo);
    if (!texto) return true;
    const digitos = soDigitos(termo);
    return campos.some((campo) =>
        normalizar(campo).includes(texto) || (digitos.length >= 3 && soDigitos(campo).includes(digitos))
    );
}
