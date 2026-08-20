import Decimal from 'decimal.js';

Decimal.set({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export const D = (valor: Decimal.Value = 0): Decimal => new Decimal(valor);
export const centavos = (valor: Decimal.Value): Decimal => D(valor).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
export const numero = (valor: Decimal.Value): number => Number(D(valor).toString());

export function convertirNumero(valor: unknown): Decimal {
  if (valor === null || valor === undefined || valor === '') return D(0);
  if (typeof valor === 'boolean') throw new Error('Un valor booleano no es un importe valido');
  if (typeof valor === 'number' || typeof valor === 'bigint') return D(valor.toString());
  let texto = String(valor).trim().replace(/\u00a0|\s/g, '');
  if (!texto) return D(0);
  if (/^#+$/.test(texto)) throw new Error('La celda contiene solo # y no un valor numerico real');
  const parentesis = texto.startsWith('(') && texto.endsWith(')');
  if (parentesis) texto = texto.slice(1, -1);
  texto = texto.replace(/[^0-9,.+\-]/g, '');
  if (!texto || texto === '+' || texto === '-') return D(0);
  if (texto.includes(',') && texto.includes('.')) {
    const decimal = texto.lastIndexOf(',') > texto.lastIndexOf('.') ? ',' : '.';
    const miles = decimal === ',' ? '.' : ',';
    texto = texto.split(miles).join('').replace(decimal, '.');
  } else if (texto.includes(',')) {
    texto = texto.split('.').join('').replace(',', '.');
  } else if ((texto.match(/\./g) ?? []).length > 1) {
    const partes = texto.split('.');
    texto = partes.slice(0, -1).join('') + '.' + partes.at(-1);
  }
  const resultado = D(texto);
  return parentesis ? resultado.negated() : resultado;
}
