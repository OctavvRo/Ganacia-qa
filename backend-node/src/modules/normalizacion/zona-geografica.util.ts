/**
 * Normaliza zonas geograficas a claves tecnicas usadas por el motor.
 *
 * La UI puede mostrar textos humanos, pero el backend trabaja con:
 * - general
 * - patagonica
 * - tdf
 * - desconocido
 */
export function normalizarZonaGeografica(valor: unknown): string | null {
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

  if (
    [
      'tdf',
      'tierra_del_fuego',
      'tierra_de_fuego',
      'ushuaia',
      'rio_grande_tdf',
      'rio_grande',
    ].includes(texto)
  ) {
    return 'tdf';
  }

  if (
    texto.includes('patagon') ||
    [
      'neuquen',
      'rio_negro',
      'rionegro',
      'chubut',
      'santa_cruz',
      'la_pampa',
      'carmen_de_patagones',
      'patagones',
    ].includes(texto)
  ) {
    return 'patagonica';
  }

  if (
    [
      'general',
      'resto_pais',
      'resto_del_pais',
      'comun',
      'mendoza',
      'caba',
      'ciudad_autonoma_de_buenos_aires',
      'buenos_aires',
      'cordoba',
      'santa_fe',
      'san_luis',
      'san_juan',
      'entre_rios',
      'corrientes',
      'misiones',
      'chaco',
      'formosa',
      'santiago_del_estero',
      'tucuman',
      'salta',
      'jujuy',
      'catamarca',
      'la_rioja',
    ].includes(texto)
  ) {
    return 'general';
  }

  return texto;
}
