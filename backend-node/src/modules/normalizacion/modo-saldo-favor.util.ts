/**
 * Normaliza el modo tecnico de tratamiento de saldo a favor.
 *
 * El Excel o la UI pueden traer textos humanos como "Compensar",
 * "Devolucion" o "Trasladar". El motor trabaja con claves tecnicas:
 * - compensar
 * - devolver
 * - saldo_para_siradig
 * - desconocido
 */
export function normalizarModoSaldoFavor(valor: unknown): string | null {
  if (valor === null || valor === undefined) return null;

  const texto = String(valor)
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  if (!texto) return null;

  if (['desconocido', 'sin_dato', 'sin_datos', 'no_informado', 'no_aplica'].includes(texto)) {
    return 'desconocido';
  }

  if (texto.includes('compens')) {
    return 'compensar';
  }

  if (texto.includes('devol') || texto.includes('reintegr')) {
    return 'devolver';
  }

  if (
    texto.includes('siradig') ||
    texto.includes('sira_dig') ||
    texto.includes('traslad') ||
    texto.includes('arrastr') ||
    texto.includes('saldo_para')
  ) {
    return 'saldo_para_siradig';
  }

  return texto;
}
