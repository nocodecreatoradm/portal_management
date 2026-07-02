// ─────────────────────────────────────────────────────────────────────────────
// peruGeo.ts — Datos Geográficos del Perú
// Distritos/ciudades por Región + Paths SVG para mapa real (viewBox 0 0 480 540)
// ─────────────────────────────────────────────────────────────────────────────

/** Normaliza una cadena de región para usarla como clave (sin tildes, sin espacios, mayúsculas) */
export const getNormalizeKey = (str: string): string =>
  (str || '')
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_')
    .trim();

// ─── REGIONES (listado oficial 25 departamentos + Callao) ─────────────────────
export const REGIONS: string[] = [
  'AMAZONAS', 'ANCASH', 'APURIMAC', 'AREQUIPA', 'AYACUCHO',
  'CAJAMARCA', 'CALLAO', 'CUSCO', 'HUANCAVELICA', 'HUANUCO',
  'ICA', 'JUNIN', 'LA LIBERTAD', 'LAMBAYEQUE', 'LIMA',
  'LORETO', 'MADRE DE DIOS', 'MOQUEGUA', 'PASCO', 'PIURA',
  'PUNO', 'SAN MARTIN', 'TACNA', 'TUMBES', 'UCAYALI',
];

// ─── DISTRITOS / CIUDADES POR REGIÓN ─────────────────────────────────────────
export const PERU_DISTRICTS: Record<string, string[]> = {
  AMAZONAS: [
    'Bagua', 'Bagua Grande', 'Chachapoyas', 'Ciro Alegría', 'El Cenepa',
    'Jumbilla', 'La Peca', 'Lamud', 'Leimebamba', 'Luya',
    'Mendoza', 'Nieva', 'Rodríguez de Mendoza', 'San Juan de Lopecancha',
  ].sort(),

  ANCASH: [
    'Aija', 'Bolognesi', 'Carhuaz', 'Caraz', 'Casma', 'Chimbote',
    'Chingas', 'Corongo', 'Huaraz', 'Huari', 'Huarmey', 'Huaylas',
    'Llanganuco', 'Mariscal Luzuriaga', 'Nuevo Chimbote', 'Ocros', 'Pallasca',
    'Pativilca', 'Pomabamba', 'Recuay', 'Santa (Chimbote)', 'Sihuas', 'Yungay',
  ].sort(),

  APURIMAC: [
    'Abancay', 'Andahuaylas', 'Antabamba', 'Aymaraes', 'Chalhuanca',
    'Chincheros', 'Chuquibambilla', 'Cotabambas', 'Grau', 'Tambobamba',
  ].sort(),

  AREQUIPA: [
    'Alto Selva Alegre', 'Aplao', 'Arequipa (Cercado)', 'Camaná', 'Caravelí',
    'Castilla (Aplao)', 'Cayma', 'Cerro Colorado', 'Chivay', 'Condesuyos',
    'Cotahuasi', 'Hunter', 'Islay', 'La Joya', 'Lari',
    'Mariano Melgar', 'Mejía', 'Miraflores (Arequipa)', 'Mollendo',
    'Orcopampa', 'Paucarpata', 'Pedregal', 'Sachaca', 'Socabaya',
    'Tiabaya', 'Uchumayo', 'Yanahuara',
  ].sort(),

  AYACUCHO: [
    'Ayna', 'Ayacucho', 'Cangallo', 'Coracora', 'Huamanga', 'Huanta',
    'Laramate', 'Lucanas', 'Parinacochas', 'Puquio', 'San Francisco',
    'San Miguel', 'Tambo', 'Vilcashuamán',
  ].sort(),

  CAJAMARCA: [
    'Bambamarca', 'Cajabamba', 'Cajamarca', 'Celendín', 'Chota',
    'Cutervo', 'Jaén', 'San Ignacio', 'San Marcos', 'San Pablo',
    'Santa Cruz (Cajamarca)', 'Ugel Cajamarca',
  ].sort(),

  CALLAO: [
    'Bellavista', 'Callao (Cercado)', 'Carmen de la Legua Reynoso',
    'La Perla', 'La Punta', 'Mi Perú', 'Ventanilla',
  ].sort(),

  CUSCO: [
    'Anta', 'Acomayo', 'Calca', 'Canas', 'Canchis', 'Chumbivilcas',
    'Cusco (Cercado)', 'Espinar', 'La Convención', 'Machu Picchu', 'Paruro',
    'Paucartambo', 'Pisac', 'Quispicanchi', 'San Jerónimo (Cusco)',
    'San Sebastián (Cusco)', 'Santiago (Cusco)', 'Sicuani', 'Urubamba', 'Wanchaq',
  ].sort(),

  HUANCAVELICA: [
    'Acobamba', 'Angaraes', 'Castrovirreyna', 'Churcampa', 'Huancavelica',
    'Huaytará', 'Lircay', 'Pampas (Tayacaja)', 'Tayacaja',
  ].sort(),

  HUANUCO: [
    'Ambo', 'Dos de Mayo', 'Huacaybamba', 'Huamalíes', 'Huánuco',
    'La Unión (Dos de Mayo)', 'Lauricocha', 'Leoncio Prado', 'Llata',
    'Marañón', 'Pachitea', 'Puerto Inca', 'Tingo María', 'Yarowilca',
  ].sort(),

  ICA: [
    'Chincha Alta', 'Chincha Baja', 'El Carmen (Chincha)', 'Ica',
    'Marcona', 'Nasca', 'Palpa', 'Pisco',
  ].sort(),

  JUNIN: [
    'Chanchamayo', 'Chupaca', 'Concepción', 'El Tambo', 'Huancayo',
    'Junín', 'Jauja', 'La Oroya', 'Pichanaqui', 'San Ramón', 'Satipo',
    'Tarma', 'Yauli',
  ].sort(),

  LA_LIBERTAD: [
    'Ascope', 'Bolívar', 'Chepén', 'El Porvenir', 'Florencia de Mora',
    'Gran Chimú', 'Huanchaco', 'Julcán', 'La Esperanza', 'Laredo',
    'Moche', 'Otuzco', 'Pacasmayo', 'Pataz', 'Poroto', 'Salaverry',
    'Sánchez Carrión', 'Santiago de Chuco', 'Simbal', 'Trujillo', 'Virú',
  ].sort(),

  LAMBAYEQUE: [
    'Chiclayo', 'Eten', 'Ferreñafe', 'Illimo', 'Jayanca',
    'José Leonardo Ortiz', 'Lambayeque', 'Monsefú', 'Mórrope', 'Motupe',
    'Olmos', 'Pimentel', 'Pomalca', 'Pucalá', 'Reque',
    'Salas', 'San José (Lambayeque)', 'Santa Rosa (Lambayeque)', 'Túcume', 'Zaña',
  ].sort(),

  LIMA: [
    'Ate', 'Barranco', 'Barranca', 'Breña', 'Carabayllo', 'Cañete',
    'Chaclacayo', 'Chorrillos', 'Cieneguilla', 'Comas', 'El Agustino',
    'Huacho', 'Huarochirí', 'Independencia', 'Jesús María', 'La Molina',
    'La Victoria', 'Lima (Cercado)', 'Lince', 'Los Olivos', 'Lurín',
    'Lurigancho-Chosica', 'Magdalena del Mar', 'Miraflores', 'Pachacámac',
    'Pueblo Libre', 'Puente Piedra', 'Punta Hermosa', 'Punta Negra',
    'Rímac', 'San Borja', 'San Isidro', 'San Juan de Lurigancho',
    'San Juan de Miraflores', 'San Luis', 'San Martín de Porres',
    'San Miguel (Lima)', 'Santa Anita', 'Santa Rosa (Lima)',
    'Santiago de Surco', 'Surquillo', 'Villa El Salvador',
    'Villa María del Triunfo', 'Yauyos',
  ].sort(),

  LORETO: [
    'Caballococha', 'Contamana (Loreto)', 'Indiana', 'Iquitos',
    'Nauta', 'Requena', 'San Lorenzo', 'Yurimaguas',
  ].sort(),

  MADRE_DE_DIOS: [
    'Iberia', 'Iñapari', 'Laberinto', 'Las Piedras', 'Puerto Maldonado',
    'Tambopata',
  ].sort(),

  MOQUEGUA: [
    'Carumas', 'El Algarrobal', 'Ilo', 'Moquegua', 'Omate',
    'Puquina', 'Samegua', 'Torata', 'Ubinas',
  ].sort(),

  PASCO: [
    'Chaupimarca', 'Daniel Alcides Carrión', 'Huariaca', 'Ninacaca',
    'Oxapampa', 'Paucartambo (Pasco)', 'Tinyahuarco', 'Villa Rica', 'Yanahuanca',
  ].sort(),

  PIURA: [
    'Ayabaca', 'Castilla', 'Catacaos', 'Chulucanas', 'Huancabamba',
    'La Unión (Piura)', 'Morropón', 'Paita', 'Piura', 'Querecotillo',
    'Sechura', 'Sullana', 'Talara',
  ].sort(),

  PUNO: [
    'Acora', 'Asillo', 'Ayaviri', 'Azángaro', 'Caminaca', 'Coata',
    'Desaguadero', 'Huancané', 'Ilave', 'Juli', 'Juliaca', 'Lampa',
    'Laraqueri', 'Macusani', 'Melgar', 'Moho', 'Puno', 'Sandia',
    'Tiquillaca', 'Yunguyo',
  ].sort(),

  SAN_MARTIN: [
    'Bellavista (San Martín)', 'Habana', 'Juanjuí', 'Lamas',
    'Moyobamba', 'Nueva Cajamarca', 'Picota', 'Rioja',
    'Saposoa', 'Soritor', 'Tabalosos', 'Tarapoto', 'Tocache', 'Uchiza',
  ].sort(),

  TACNA: [
    'Alto de la Alianza', 'Calana', 'Ciudad Nueva', 'Gregorio Albarracín',
    'Inclán', 'Palca', 'Pocollay', 'Sama', 'Tacna (Cercado)', 'Tarata',
  ].sort(),

  TUMBES: [
    'Aguas Verdes', 'Canoas de Punta Sal', 'Corrales', 'La Cruz',
    'Matapalo', 'Pampas de Hospital', 'Papayal', 'San Jacinto',
    'San Juan de la Virgen', 'Tumbes', 'Zarumilla', 'Zorritos',
  ].sort(),

  UCAYALI: [
    'Aguaytía', 'Atalaya', 'Campo Verde', 'Contamana (Ucayali)',
    'Coronel Portillo', 'Iparía', 'Masisea', 'Nueva Requena',
    'Padre Abad', 'Pucallpa', 'Purús', 'Raymondi', 'Sepahua',
    'Tahuanía', 'Yarinacocha',
  ].sort(),
};

// ─── PATHS SVG REALES DEL PERÚ (viewBox 0 0 480 540) ──────────────────────────
// Polígonos simplificados pero geográficamente representativos de cada departamento
export interface RegionPath {
  key: string;
  name: string;
  path: string;
  labelX: number;
  labelY: number;
}

export const PERU_SVG_PATHS: RegionPath[] = [
  {
    key: 'TUMBES',
    name: 'Tumbes',
    path: 'M 18,88 L 42,82 L 56,100 L 58,125 L 38,132 L 18,118 Z',
    labelX: 30, labelY: 108,
  },
  {
    key: 'PIURA',
    name: 'Piura',
    path: 'M 0,105 L 18,88 L 18,118 L 38,132 L 56,165 L 58,198 L 35,208 L 18,200 L 5,180 L 0,155 Z',
    labelX: 22, labelY: 158,
  },
  {
    key: 'LAMBAYEQUE',
    name: 'Lambayeque',
    path: 'M 35,208 L 58,198 L 78,202 L 86,228 L 68,240 L 42,232 Z',
    labelX: 55, labelY: 220,
  },
  {
    key: 'CAJAMARCA',
    name: 'Cajamarca',
    path: 'M 56,165 L 58,198 L 78,202 L 108,225 L 165,238 L 178,202 L 188,168 L 162,140 L 130,130 L 100,138 L 72,158 Z',
    labelX: 118, labelY: 185,
  },
  {
    key: 'LA_LIBERTAD',
    name: 'La Libertad',
    path: 'M 42,232 L 68,240 L 86,228 L 108,225 L 165,238 L 175,272 L 158,300 L 118,302 L 90,285 L 70,262 L 48,252 Z',
    labelX: 108, labelY: 262,
  },
  {
    key: 'AMAZONAS',
    name: 'Amazonas',
    path: 'M 130,130 L 162,140 L 188,168 L 208,162 L 242,148 L 252,118 L 228,85 L 195,78 L 165,82 L 142,98 Z',
    labelX: 192, labelY: 118,
  },
  {
    key: 'LORETO',
    name: 'Loreto',
    path: 'M 195,78 L 228,85 L 252,118 L 275,140 L 288,178 L 295,218 L 318,240 L 362,248 L 415,252 L 480,248 L 480,0 L 248,0 Z',
    labelX: 368, labelY: 105,
  },
  {
    key: 'SAN_MARTIN',
    name: 'San Martín',
    path: 'M 208,162 L 242,148 L 252,118 L 275,140 L 288,178 L 295,218 L 272,245 L 242,255 L 218,248 L 208,228 L 200,198 Z',
    labelX: 244, labelY: 192,
  },
  {
    key: 'HUANUCO',
    name: 'Huánuco',
    path: 'M 165,238 L 178,202 L 188,168 L 208,162 L 200,198 L 208,228 L 218,248 L 242,255 L 260,250 L 278,275 L 265,298 L 238,312 L 210,300 L 198,275 L 190,252 Z',
    labelX: 218, labelY: 268,
  },
  {
    key: 'UCAYALI',
    name: 'Ucayali',
    path: 'M 295,218 L 318,240 L 362,248 L 415,252 L 435,295 L 440,362 L 415,392 L 390,400 L 358,398 L 325,382 L 298,350 L 282,318 L 278,275 Z',
    labelX: 368, labelY: 312,
  },
  {
    key: 'ANCASH',
    name: 'Ancash',
    path: 'M 70,262 L 90,285 L 118,302 L 158,300 L 175,272 L 192,272 L 195,300 L 185,332 L 162,348 L 130,345 L 102,328 L 80,308 L 65,285 Z',
    labelX: 125, labelY: 305,
  },
  {
    key: 'PASCO',
    name: 'Pasco',
    path: 'M 210,300 L 238,312 L 248,332 L 228,350 L 208,338 L 205,318 Z',
    labelX: 218, labelY: 328,
  },
  {
    key: 'JUNIN',
    name: 'Junín',
    path: 'M 205,318 L 208,338 L 228,350 L 248,332 L 282,318 L 298,348 L 290,378 L 262,388 L 232,375 L 208,362 L 205,342 Z',
    labelX: 248, labelY: 355,
  },
  {
    key: 'LIMA',
    name: 'Lima',
    path: 'M 80,308 L 102,328 L 130,345 L 162,348 L 185,332 L 200,330 L 202,352 L 195,375 L 175,390 L 150,388 L 125,372 L 105,352 L 88,330 Z',
    labelX: 138, labelY: 358,
  },
  {
    key: 'CALLAO',
    name: 'Callao',
    path: 'M 83,332 L 96,328 L 98,342 L 84,345 Z',
    labelX: 84, labelY: 340,
  },
  {
    key: 'ICA',
    name: 'Ica',
    path: 'M 88,330 L 105,352 L 125,372 L 150,388 L 175,390 L 185,415 L 172,445 L 150,455 L 120,445 L 100,425 L 88,400 Z',
    labelX: 128, labelY: 415,
  },
  {
    key: 'HUANCAVELICA',
    name: 'Huancavelica',
    path: 'M 200,330 L 210,312 L 205,342 L 208,362 L 225,372 L 220,392 L 202,398 L 182,385 L 178,372 L 175,390 L 195,375 L 202,352 Z',
    labelX: 196, labelY: 368,
  },
  {
    key: 'AYACUCHO',
    name: 'Ayacucho',
    path: 'M 220,392 L 225,372 L 232,375 L 262,388 L 290,378 L 300,402 L 282,438 L 255,448 L 232,438 L 215,420 Z',
    labelX: 255, labelY: 418,
  },
  {
    key: 'APURIMAC',
    name: 'Apurímac',
    path: 'M 255,448 L 282,438 L 300,402 L 322,405 L 332,425 L 315,448 L 288,462 L 258,462 Z',
    labelX: 290, labelY: 438,
  },
  {
    key: 'CUSCO',
    name: 'Cusco',
    path: 'M 300,402 L 290,378 L 298,348 L 325,358 L 362,372 L 388,398 L 390,400 L 382,438 L 358,462 L 328,468 L 302,462 L 288,462 L 315,448 L 332,425 L 322,405 Z',
    labelX: 338, labelY: 425,
  },
  {
    key: 'MADRE_DE_DIOS',
    name: 'Madre de Dios',
    path: 'M 390,400 L 415,392 L 440,362 L 480,372 L 480,480 L 452,488 L 420,485 L 392,472 L 382,458 L 382,438 Z',
    labelX: 432, labelY: 435,
  },
  {
    key: 'AREQUIPA',
    name: 'Arequipa',
    path: 'M 100,425 L 120,445 L 150,455 L 172,445 L 188,458 L 215,475 L 258,482 L 288,482 L 315,478 L 322,492 L 302,518 L 265,525 L 218,525 L 178,510 L 148,488 L 118,465 L 100,445 Z',
    labelX: 208, labelY: 492,
  },
  {
    key: 'PUNO',
    name: 'Puno',
    path: 'M 328,468 L 358,462 L 382,438 L 382,458 L 392,472 L 420,485 L 428,508 L 412,528 L 385,538 L 358,535 L 345,525 L 342,492 L 322,492 L 315,478 L 315,448 L 302,462 Z',
    labelX: 368, labelY: 498,
  },
  {
    key: 'MOQUEGUA',
    name: 'Moquegua',
    path: 'M 302,518 L 322,492 L 342,492 L 355,508 L 345,525 L 318,532 L 302,525 Z',
    labelX: 325, labelY: 512,
  },
  {
    key: 'TACNA',
    name: 'Tacna',
    path: 'M 318,532 L 345,525 L 365,525 L 375,538 L 358,548 L 318,548 L 302,538 Z',
    labelX: 338, labelY: 540,
  },
];
