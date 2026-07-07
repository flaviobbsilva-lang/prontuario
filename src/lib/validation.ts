// Validação de entrada para cadastro de paciente. Roda no servidor (Server
// Action), então mesmo que o formulário no navegador seja adulterado, o
// banco não recebe dado em formato claramente inválido.

export function limparCPF(cpf: string): string {
  return cpf.replace(/\D/g, "");
}

/** Validação por dígito verificador (algoritmo oficial da Receita Federal). */
export function cpfValido(cpfBruto: string): boolean {
  const cpf = limparCPF(cpfBruto);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false; // 000.000.000-00, 111.111.111-11 etc.

  const calcDigito = (base: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (pesoInicial - i);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };

  const d1 = calcDigito(cpf.slice(0, 9), 10);
  const d2 = calcDigito(cpf.slice(0, 9) + d1, 11);
  return cpf === cpf.slice(0, 9) + String(d1) + String(d2);
}

export function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Aceita "AAAA-MM-DD" (formato do <input type="date">). Rejeita datas futuras ou absurdas. */
export function dataNascimentoValida(data: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return false;
  const d = new Date(data + "T00:00:00");
  if (Number.isNaN(d.getTime())) return false;
  const hoje = new Date();
  return d <= hoje && d.getFullYear() > 1900;
}
