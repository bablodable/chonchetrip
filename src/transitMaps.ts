export type TransitLine = {
  code: string
  name: string
  color: string
  textColor?: string
  tripNeedle: string
}

export type TransitHomeStop = {
  role: string
  name: string
  note: string
  lines: Array<{
    code: string
    name: string
    color: string
    textColor?: string
  }>
}

export type TransitMap = {
  id: 'osaka' | 'tokyo'
  city: string
  localName: string
  operator: string
  sourceUrl: string
  mapImage: string
  mapAlt: string
  homeSummary: string
  home: string
  homeArea: string
  homeStops: TransitHomeStop[]
  extraLineCodes: string[]
  lines: TransitLine[]
  railNote: string
}

export const transitMaps: TransitMap[] = [
  {
    id: 'osaka',
    city: 'Osaka',
    localName: '大阪',
    operator: 'Osaka Metro',
    sourceUrl: 'https://subway.osakametro.co.jp/en/guide/routemap.php',
    mapImage: '/assets/transit/osaka-metro-map.webp',
    mapAlt: 'Официальная схема линий Osaka Metro',
    homeSummary: 'Домой: Nagahoribashi · K16 / N16',
    home: 'Grand Hostel LDK Osaka Shinsaibashi',
    homeArea: 'Shimanouchi · район Shinsaibashi',
    homeStops: [
      {
        role: 'Главная станция домой',
        name: 'Nagahoribashi',
        note: 'Exit 7 · около 3 минут пешком до отеля',
        lines: [
          { code: 'K16', name: 'Sakaisuji', color: '#814721' },
          { code: 'N16', name: 'Nagahori Tsurumi-ryokuchi', color: '#a9cc51', textColor: '#33421d' },
        ],
      },
      {
        role: 'Можно дойти и отсюда',
        name: 'Shinsaibashi',
        note: 'Exit 5 · около 10 минут пешком до отеля',
        lines: [{ code: 'M19', name: 'Midosuji', color: '#e5171f' }],
      },
    ],
    extraLineCodes: [],
    lines: [
      { code: 'K', name: 'Sakaisuji', color: '#814721', tripNeedle: 'Sakaisuji Line' },
      { code: 'M', name: 'Midosuji', color: '#e5171f', tripNeedle: 'Midosuji Line' },
      { code: 'N', name: 'Nagahori Tsurumi-ryokuchi', color: '#a9cc51', textColor: '#33421d', tripNeedle: 'Nagahori Tsurumi-ryokuchi Line' },
    ],
    railNote: 'Nankai, JR, Kintetsu и Keihan — не метро. Для аэропорта, USJ, Nara и Kyoto открывай путь в карточке нужного дня.',
  },
  {
    id: 'tokyo',
    city: 'Tokyo',
    localName: '東京',
    operator: 'Tokyo Metro + Toei',
    sourceUrl: 'https://www.gotokyo.org/en/plan/pdf-download/documents/rotemap_ttg_lite_all_en.pdf',
    mapImage: '/assets/transit/tokyo-subway-map.webp',
    mapAlt: 'Официальная схема метро и городских поездов Tokyo',
    homeSummary: 'Домой: Daimon · рядом JR Hamamatsucho',
    home: 'Жильё в районе Shiba',
    homeArea: 'между Daimon и Hamamatsucho',
    homeStops: [
      {
        role: 'Метро у дома',
        name: 'Daimon',
        note: 'Сюда возвращаемся на метро',
        lines: [
          { code: 'A09', name: 'Asakusa', color: '#e85298' },
          { code: 'E20', name: 'Oedo', color: '#b6007a' },
        ],
      },
      {
        role: 'JR у дома',
        name: 'Hamamatsucho',
        note: 'Yamanote / Keihin-Tohoku · здесь же Monorail в Haneda',
        lines: [
          { code: 'JY28', name: 'Yamanote', color: '#80c342', textColor: '#263a18' },
          { code: 'JK23', name: 'Keihin-Tohoku', color: '#00b2e5', textColor: '#073945' },
        ],
      },
    ],
    extraLineCodes: ['G', 'H', 'T'],
    lines: [
      { code: 'A', name: 'Asakusa', color: '#e85298', tripNeedle: 'Asakusa Line' },
      { code: 'E', name: 'Oedo', color: '#b6007a', tripNeedle: 'Oedo Line' },
      { code: 'G', name: 'Ginza', color: '#f39700', textColor: '#4f3400', tripNeedle: 'Ginza Line' },
      { code: 'H', name: 'Hibiya', color: '#9caeb7', textColor: '#263840', tripNeedle: 'Hibiya Line' },
      { code: 'T', name: 'Tozai', color: '#00a7db', textColor: '#073945', tripNeedle: 'Tozai Line' },
    ],
    railNote: 'Daimon — метро, Hamamatsucho — JR. Это две соседние станции у нашего жилья; на обеих проходим по Suica.',
  },
]
