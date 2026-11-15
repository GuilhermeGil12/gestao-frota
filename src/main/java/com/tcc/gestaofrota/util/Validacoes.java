package com.tcc.gestaofrota.util;

import java.time.LocalDate;
import java.util.regex.Pattern;

/**
 * Validação de formato dos campos, igual à do frontend (gestao-frota-web/src/utils/validacoes.js).
 *
 * O frontend avisa na hora, campo por campo; aqui é a garantia: quem chamar a API direto
 * (sem passar pela tela) também não consegue salvar um CPF pela metade ou uma placa errada.
 *
 * Cada método lança RuntimeException com a mensagem em pt-BR. O GlobalExceptionHandler
 * devolve isso como 400 { "message": "..." }, e a tela mostra no toast.
 */
public final class Validacoes {

    public static final int SENHA_MINIMA = 8;

    private static final Pattern EMAIL = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$");
    private static final Pattern PLACA = Pattern.compile("^[A-Z]{3}\\d[A-Z0-9]\\d{2}$");
    private static final Pattern MAC = Pattern.compile("^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$");
    private static final Pattern HEX = Pattern.compile("^[0-9A-F]+$");

    private Validacoes() {
    }

    // ---------- Genéricos ----------

    /**
     * Na atualização, só valida o campo que mudou: assim um cadastro antigo com dado fora do
     * padrão ainda pode ser ativado/inativado (o botão reenvia o registro inteiro).
     * antigo == null significa cadastro novo: valida tudo.
     */
    public static boolean mudou(Object novo, Object antigo, boolean cadastroNovo) {
        return cadastroNovo || !java.util.Objects.equals(novo, antigo);
    }

    public static boolean vazio(String v) {
        return v == null || v.isBlank();
    }

    public static String soDigitos(String v) {
        return v == null ? "" : v.replaceAll("\\D", "");
    }

    public static void obrigatorio(String v, String campo) {
        if (vazio(v)) throw new RuntimeException(campo + " é obrigatório.");
    }

    public static void tamanho(String v, int min, int max, String campo) {
        int t = v == null ? 0 : v.trim().length();
        if (t < min) throw new RuntimeException(campo + " precisa ter pelo menos " + min + " caracteres.");
        if (t > max) throw new RuntimeException(campo + " pode ter no máximo " + max + " caracteres.");
    }

    // ---------- Pessoa ----------

    public static void nomeCompleto(String nome) {
        obrigatorio(nome, "Nome");
        String n = nome.trim();
        tamanho(n, 5, 120, "Nome");
        if (n.matches(".*\\d.*")) throw new RuntimeException("Nome não pode ter números.");
        if (n.split("\\s+").length < 2) throw new RuntimeException("Informe nome e sobrenome.");
    }

    /** CPF: 11 dígitos e os 2 dígitos verificadores certos. */
    public static void cpf(String valor) {
        String cpf = soDigitos(valor);
        if (cpf.length() != 11) throw new RuntimeException("CPF precisa ter 11 números.");
        if (cpf.chars().distinct().count() == 1) throw new RuntimeException("CPF inválido.");
        if (digitoCpf(cpf, 9) != cpf.charAt(9) - '0' || digitoCpf(cpf, 10) != cpf.charAt(10) - '0') {
            throw new RuntimeException("CPF inválido (dígito verificador não confere).");
        }
    }

    private static int digitoCpf(String cpf, int tamanhoBase) {
        int soma = 0;
        for (int i = 0; i < tamanhoBase; i++) soma += (cpf.charAt(i) - '0') * (tamanhoBase + 1 - i);
        int resto = (soma * 10) % 11;
        return resto == 10 ? 0 : resto;
    }

    /** RG: o formato muda por estado; de 7 a 9 caracteres, só números (o último pode ser X). */
    public static void rg(String valor) {
        String rg = valor == null ? "" : valor.replaceAll("[^0-9Xx]", "");
        if (!rg.matches("^\\d+[Xx]?$") || rg.length() < 7 || rg.length() > 9) {
            throw new RuntimeException("RG inválido: de 7 a 9 caracteres, só números (o último pode ser X).");
        }
    }

    /** Telefone com DDD: fixo (10 números) ou celular (11 números, começando com 9). */
    public static void telefone(String valor) {
        String tel = soDigitos(valor);
        if (tel.length() != 10 && tel.length() != 11) throw new RuntimeException("Telefone precisa ter DDD + número.");
        if (Integer.parseInt(tel.substring(0, 2)) < 11) throw new RuntimeException("DDD inválido.");
        if (tel.length() == 11 && tel.charAt(2) != '9') throw new RuntimeException("Celular precisa começar com 9 depois do DDD.");
    }

    public static void email(String valor) {
        obrigatorio(valor, "E-mail");
        if (valor.trim().length() > 120 || !EMAIL.matcher(valor.trim()).matches()) {
            throw new RuntimeException("E-mail inválido.");
        }
    }

    /** CEP é opcional; se vier, precisa ter 8 números. */
    public static void cepOpcional(String valor) {
        if (vazio(valor)) return;
        if (soDigitos(valor).length() != 8) throw new RuntimeException("CEP precisa ter 8 números.");
    }

    public static void cnh(String valor) {
        String cnh = soDigitos(valor);
        if (cnh.length() != 11) throw new RuntimeException("CNH precisa ter 11 números.");
        if (cnh.chars().distinct().count() == 1) throw new RuntimeException("CNH inválida.");
    }

    public static void validadeCnh(LocalDate validade) {
        if (validade == null) throw new RuntimeException("Validade da CNH é obrigatória.");
        int ano = validade.getYear();
        if (ano < 1980 || ano > LocalDate.now().getYear() + 15) throw new RuntimeException("Confira o ano da validade da CNH.");
    }

    public static void senha(String senha) {
        if (senha == null || senha.length() < SENHA_MINIMA) {
            throw new RuntimeException("A senha precisa ter pelo menos " + SENHA_MINIMA + " caracteres.");
        }
        if (senha.length() > 72) throw new RuntimeException("A senha pode ter no máximo 72 caracteres.");
    }

    // ---------- Veículo ----------

    /** Placa antiga (ABC-1234) ou Mercosul (ABC1D23). */
    public static void placa(String valor) {
        String placa = valor == null ? "" : valor.replaceAll("[^A-Za-z0-9]", "").toUpperCase();
        if (!PLACA.matcher(placa).matches()) {
            throw new RuntimeException("Placa inválida. Use ABC-1234 ou ABC1D23 (Mercosul).");
        }
    }

    /** RENAVAM: 11 números com dígito verificador (os antigos, de 9, são completados com zeros). */
    public static void renavam(String valor) {
        String ren = soDigitos(valor);
        if (ren.length() != 9 && ren.length() != 11) throw new RuntimeException("RENAVAM precisa ter 11 números.");
        ren = "0".repeat(11 - ren.length()) + ren;
        int[] pesos = {3, 2, 9, 8, 7, 6, 5, 4, 3, 2};
        int soma = 0;
        for (int i = 0; i < 10; i++) soma += pesos[i] * (ren.charAt(i) - '0');
        int dv = (soma * 10) % 11;
        if (dv == 10) dv = 0;
        if (dv != ren.charAt(10) - '0') throw new RuntimeException("RENAVAM inválido (dígito verificador não confere).");
    }

    /** Limite de velocidade é opcional (sem valor, vale 110 km/h). */
    public static void velocidadeMaximaOpcional(Double v) {
        if (v == null) return;
        if (v < 20 || v > 200) throw new RuntimeException("O limite de velocidade precisa estar entre 20 e 200 km/h.");
    }

    // ---------- Equipamentos ----------

    /** MAC é opcional: devolve null se vazio, ou o MAC em maiúsculas se válido. */
    public static String macOpcional(String valor) {
        if (vazio(valor)) return null;
        mac(valor);
        return valor.trim().toUpperCase();
    }

    /** IMEI é opcional: 15 números com dígito verificador (Luhn). Devolve null se vazio. */
    public static String imeiOpcional(String valor) {
        if (vazio(valor)) return null;
        String imei = soDigitos(valor);
        if (imei.length() != 15) throw new RuntimeException("IMEI precisa ter 15 números.");
        int soma = 0;
        for (int i = 0; i < 15; i++) {
            int d = imei.charAt(i) - '0';
            if (i % 2 == 1) { d *= 2; if (d > 9) d -= 9; }
            soma += d;
        }
        if (soma % 10 != 0) throw new RuntimeException("IMEI inválido (dígito verificador não confere).");
        return imei;
    }

    /** Linha do chip é opcional: se vier, telefone com DDD. Devolve só os números, ou null. */
    public static String telefoneOpcional(String valor) {
        if (vazio(valor)) return null;
        telefone(valor);
        return soDigitos(valor);
    }

    public static void mac(String valor) {
        if (valor == null || !MAC.matcher(valor.trim()).matches()) {
            throw new RuntimeException("MAC inválido. Use 6 pares: 00:1B:44:11:3A:B7");
        }
    }

    /** UID do cartão RFID: 4, 7 ou 10 bytes em hexadecimal (8, 14 ou 20 caracteres). Devolve normalizado. */
    public static String uid(String valor) {
        String uid = valor == null ? "" : valor.replaceAll("[\\s:-]", "").toUpperCase();
        if (!HEX.matcher(uid).matches()) throw new RuntimeException("O código do cartão só tem números e letras de A a F.");
        if (uid.length() != 8 && uid.length() != 14 && uid.length() != 20) {
            throw new RuntimeException("O código do cartão tem 8, 14 ou 20 caracteres.");
        }
        return uid;
    }
}
