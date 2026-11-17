/**
 * Países y sus ciudades principales para los desplegables en cascada.
 * Bolivia va primero porque es donde opera el producto.
 */
export const LOCATIONS: Record<string, string[]> = {
  Bolivia: [
    'La Paz', 'El Alto', 'Santa Cruz', 'Cochabamba', 'Sucre', 'Oruro', 'Potosí',
    'Tarija', 'Trinidad', 'Cobija', 'Quillacollo', 'Sacaba', 'Colcapirhua', 'Vinto',
    'Montero', 'Warnes', 'Riberalta', 'Yacuiba', 'Villa Montes', 'Camiri',
    'Villazón', 'Tupiza', 'Uyuni',
  ],
  Argentina: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'Salta', 'Tucumán', 'La Plata', 'Mar del Plata', 'Jujuy'],
  Brasil: ['São Paulo', 'Río de Janeiro', 'Brasilia', 'Salvador', 'Curitiba', 'Porto Alegre', 'Belo Horizonte', 'Corumbá'],
  Chile: ['Santiago', 'Valparaíso', 'Concepción', 'Antofagasta', 'Arica', 'Iquique', 'La Serena', 'Temuco'],
  China: ['Pekín', 'Shanghái', 'Guangzhou', 'Shenzhen', 'Hong Kong', 'Yiwu'],
  Colombia: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga'],
  Ecuador: ['Quito', 'Guayaquil', 'Cuenca', 'Ambato'],
  España: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Málaga'],
  'Estados Unidos': ['Miami', 'Nueva York', 'Los Ángeles', 'Houston', 'Chicago', 'Washington D. C.'],
  México: ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Tijuana', 'Cancún'],
  Panamá: ['Ciudad de Panamá', 'Colón', 'David'],
  Paraguay: ['Asunción', 'Ciudad del Este', 'Encarnación', 'Luque'],
  Perú: ['Lima', 'Arequipa', 'Cusco', 'Trujillo', 'Tacna', 'Puno', 'Iquitos'],
  Uruguay: ['Montevideo', 'Salto', 'Punta del Este', 'Paysandú'],
  Venezuela: ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto'],
};

export const COUNTRY_NAMES = Object.keys(LOCATIONS);

export function citiesOf(country: string): string[] {
  return LOCATIONS[country] ?? [];
}