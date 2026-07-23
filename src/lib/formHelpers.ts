/** Lê um campo de texto do FormData; string vazia vira null. */
export function textoOuNull(formData: FormData, campo: string): string | null {
  const valor = (formData.get(campo) as string | null)?.trim() ?? ''
  return valor.length > 0 ? valor : null
}

/** Lê um campo numérico (aceita vírgula decimal) do FormData; vazio ou inválido vira null. */
export function numeroOuNull(formData: FormData, campo: string): number | null {
  const valor = (formData.get(campo) as string | null)?.trim() ?? ''
  if (!valor) return null
  const n = Number.parseFloat(valor.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

/** Lê um campo inteiro do FormData; vazio ou inválido vira null. */
export function intOuNull(formData: FormData, campo: string): number | null {
  const valor = (formData.get(campo) as string | null)?.trim() ?? ''
  if (!valor) return null
  const n = Number.parseInt(valor, 10)
  return Number.isInteger(n) ? n : null
}
