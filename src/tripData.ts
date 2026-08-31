export type TimelineItem = {
  id: string
  time: string
  title: string
  kind: 'route' | 'place' | 'food' | 'quest' | 'rest'
  details: string[]
  food?: FoodPlan
}

export type FoodOption = {
  name: string
  note: string
}

export type FoodPlan =
  | {
    mode: 'primary'
    meal: string
    primary: FoodOption
    alternatives?: FoodOption[]
    fallback?: string
  }
  | {
    mode: 'mood'
    meal: string
    choices: FoodOption[]
  }
  | {
    mode: 'free'
    meal: string
    area?: string
    note: string
    alternatives?: FoodOption[]
  }

export type Riddle = {
  question: string
  hint: string
  options: string[]
  answer: number
  explanation: string
  location?: string
}

export type DayVibe = {
  tone: 'gentle' | 'steady' | 'full' | 'adventure'
  label: string
  title: string
  description: string
  rule: string
  icon: string
}

export type TripDay = {
  id: string
  date: string
  dateLabel: string
  city: string
  eyebrow: string
  title: string
  subtitle: string
  vibe: DayVibe
  cover: string
  mapFile?: string
  mapNote?: string
  mapRouteScenes?: string[][]
  mapStartProgress?: number
  achievementId?: string
  achievementTitle?: string
  claimLabel?: string
  fact: string
  riddle: Riddle
  timeline: TimelineItem[]
}

export type Achievement = {
  id: string
  title: string
  description: string
  type: 'story' | 'secret' | 'meta'
  unlockDate?: string
  image: string
}

export type SideQuest = {
  id: string
  title: string
  description: string
  icon: 'camera' | 'food' | 'fox' | 'place' | 'quest' | 'route' | 'sparkles'
}

const cover = {
  osaka: '/assets/osaka-cover.webp',
  kyoto: '/assets/kyoto-cover.webp',
  tokyo: '/assets/tokyo-cover.webp',
  fuji: '/assets/fuji-cover.webp',
  intro: '/assets/chonchetrip-splash.webp',
}

const badge = (name: string) => `/assets/achivments/${name}.webp`

const primaryFood = (meal: string, name: string, note: string, alternatives?: FoodOption[], fallback?: string): FoodPlan => ({
  mode: 'primary',
  meal,
  primary: { name, note },
  alternatives,
  fallback,
})

const moodFood = (meal: string, choices: FoodOption[]): FoodPlan => ({ mode: 'mood', meal, choices })

const freeFood = (meal: string, note: string, area?: string, alternatives?: FoodOption[]): FoodPlan => ({
  mode: 'free',
  meal,
  area,
  note,
  alternatives,
})

const dayVibe = (tone: DayVibe['tone'], label: string, title: string, description: string, rule: string, icon: string): DayVibe => ({
  tone,
  label,
  title,
  description,
  rule,
  icon,
})

export const tripDays: TripDay[] = [
  {
    id: 'belgrade-dubai',
    date: '2026-09-29',
    dateLabel: '29 сентября',
    city: 'Belgrade → Dubai',
    eyebrow: 'Пролог · Дорога на Восток',
    title: 'Путь к Японии начался',
    subtitle: 'Belgrade, ночной Dubai и ожидание главного рейса',
    vibe: dayVibe('gentle', 'Переходный', 'Дорога без гонки', 'Сегодня достаточно добраться, поесть, перевести дыхание и беречь силы для Japan.', 'Правило дня: gate важнее любой дополнительной остановки.', '✈️'),
    cover: cover.intro,
    mapFile: '2026-09-30-arrival-osaka.html',
    mapNote: 'Общая карта 29–30 сентября. Локальные точки начинаются после прилёта в KIX.',
    fact: 'DXB Terminal 3 разделён на несколько concourse, поэтому после Transit сначала важнее проверить gate и только потом планировать прогулку по магазинам.',
    riddle: {
      question: 'Из какого терминала DXB отправляется рейс в Osaka?',
      hint: 'Ответ есть в билете на второй перелёт и на экранах Transit.',
      options: ['Terminal 1', 'Terminal 2', 'Terminal 3', 'Al Maktoum'],
      answer: 2,
      explanation: 'Следующий рейс начинается в DXB Terminal 3 — после Transit первым делом нужно проверить gate.',
      location: 'Dubai DXB · Terminal 3, экраны Transit',
    },
    timeline: [
      {
        id: 'beg-departure',
        time: '13:55',
        title: 'Поднять первый самолёт истории',
        kind: 'route',
        details: ['Belgrade BEG Terminal 2 → Dubai. Документы под рукой, впереди ночная пересадка и ещё один большой перелёт.'],
      },
      {
        id: 'dubai-arrival',
        time: '21:25',
        title: 'Приземлиться между двумя мирами',
        kind: 'route',
        details: ['Dubai DXB Terminal 3 → пройти Transit и сразу проверить gate рейса в Kansai.'],
      },
      {
        id: 'dubai-concourse-b',
        time: 'Если по пути',
        title: 'Заглянуть в Bath & Body Works',
        kind: 'place',
        details: ['Если маршрут проходит через Concourse B — спокойно посмотреть свечи, кремы и ароматы.', 'Не делать отдельный большой крюк, если следующий gate находится далеко.'],
      },
      {
        id: 'dubai-reset',
        time: 'До посадки',
        title: 'Перевести дыхание перед Японией',
        kind: 'rest',
        details: ['Найти воду, зарядку и место рядом с gate. В 03:00 начинается перелёт к Osaka.'],
      },
    ],
  },
  {
    id: 'arrival-osaka',
    date: '2026-09-30',
    dateLabel: '30 сентября',
    city: 'Osaka',
    eyebrow: 'Глава 01 · Прибытие',
    title: 'Первый фонарь зажжён',
    subtitle: 'DXB, KIX, билет Kuroshio и неон Dotonbori',
    vibe: dayVibe('steady', 'Мягкий старт', 'Мягкое приземление', 'Первый вечер — не марафон: Япония уже началась, даже если получится только неон и тёплый ужин.', 'Главное: билет, заселение, еда. Бонусы — только по силам.', '🏮'),
    cover: cover.osaka,
    mapFile: '2026-09-30-arrival-osaka.html',
    mapRouteScenes: [['kix-arrival'], ['kuroshio-ticket', 'stamp-kix'], ['to-hotel-osaka'], ['osaka-checkin'], ['dotonbori'], ['dotonbori-snack'], ['osaka-dinner'], ['travel-passport'], ['shinsaibashi-night'], ['shinsaibashi-night']],
    achievementId: 'welcome-to-japan',
    achievementTitle: 'Welcome to Japan',
    claimLabel: 'Я в Японии!',
    fact: 'Японские станционные штампы называются eki stamp. Они бесплатные и часто спрятаны рядом с кассами или выходами станции.',
    riddle: {
      question: 'Какую победную позу застыл делать бегущий человек Glico?',
      hint: 'Встань на Ebisubashi и посмотри на самую знаменитую вывеску через канал.',
      options: ['Поднял обе руки', 'Скрестил руки', 'Держит факел', 'Показывает сердечко'],
      answer: 0,
      explanation: 'Бегущий человек пересекает воображаемый финиш с обеими руками над головой.',
      location: 'Dotonbori · вывеска Glico у моста Ebisubashi',
    },
    timeline: [
      {
        id: 'kix-arrival',
        time: '17:15',
        title: 'Шагнуть в Японию',
        kind: 'route',
        details: ['KIX Terminal 1 → Immigration: паспорт и Visit Japan Web QR.', 'Затем Baggage → Customs → Arrivals.'],
      },
      {
        id: 'kuroshio-ticket',
        time: 'После Customs',
        title: 'Купить билет на завтра',
        kind: 'quest',
        details: ['Подняться на 2F и перейти к Kansai-airport Station → JR-WEST Ticket Office / Midori-no-madoguchi.', 'Попросить: “Kuroshio 1, Tennoji to Shirahama, October 1, 7:59 AM. Two adults, reserved seats together.”', 'Купить только туда, два Reserved Seats рядом; оплатить картой.'],
      },
      {
        id: 'stamp-kix',
        time: 'Первая находка',
        title: 'Поставить печать начала пути',
        kind: 'quest',
        details: ['На Kansai Airport Station найти 駅スタンプ / Eki Stamp — это станционная печать #1.', 'Красивый Travel Passport купите вечером в Osaka, поэтому сейчас поставьте печать на чистую маленькую карточку. Потом вклеите её на первую страницу — не в загранпаспорт. К храмовым goshuin она не относится.'],
      },
      {
        id: 'to-hotel-osaka',
        time: 'После билетов',
        title: 'Прокатиться на первом японском поезде',
        kind: 'route',
        details: ['Kansai Airport → Nankai Rapi:t до Tengachaya.', 'На Tengachaya войти в Osaka Metro по Suica → Sakaisuji Line → Nagahoribashi → выход по Suica.', 'Exit 7 → около трёх минут пешком до Grand Hostel LDK Osaka Shinsaibashi.'],
      },
      {
        id: 'osaka-checkin',
        time: '~20:00',
        title: 'Сбросить рюкзаки',
        kind: 'rest',
        details: ['Check-in в Grand Hostel LDK Osaka Shinsaibashi и небольшой отдых перед неоном.'],
      },
      {
        id: 'dotonbori',
        time: '~20:30',
        title: 'Пройти неоновое крещение',
        kind: 'place',
        details: ['Dotonbori → Ebisu Bridge → вывеска Glico.', 'После Glico, если вечер идёт спокойно: заглянуть в Hōzenji и Hōzenji Yokocho — мшистый Mizukake Fudō, каменная улочка и тишина в двух шагах от неона. На всё около 15 минут; если уже хочется есть или нужно успеть за Travel Passport, просто пройти мимо без сожалений.', 'Ebisu Tower у Don Quijote — совсем необязательный бонус на случай избытка сил: овальное колесо, один круг около 15 минут. Проверить, что есть запас по времени и колесо работает, прежде чем вставать в очередь.'],
      },
      {
        id: 'dotonbori-snack',
        time: 'По пути',
        title: 'Перехватить что-нибудь горячее на ходу',
        kind: 'food',
        food: freeFood('Перекус', 'Если захочется — взять takoyaki по пути и идти дальше без отдельной остановки.', 'Dotonbori', [{ name: 'Takoyaki Wanaka', note: 'Такояки для прогулки под неоном.' }]),
        details: [],
      },
      {
        id: 'osaka-dinner',
        time: 'После прогулки',
        title: 'Собрать первый ужин в Osaka',
        kind: 'food',
        food: primaryFood('Ужин', 'Teppan Okonomiyaki Mitsuki', 'Okonomiyaki на теппане — тёплый первый ужин без лишнего плана.', [{ name: 'Ajinoya Honten', note: 'Okonomiyaki в том же настроении, если Mitsuki не подойдёт.' }], 'Можно спокойно выбрать другое место рядом в Dotonbori.'),
        details: [],
      },
      {
        id: 'travel-passport',
        time: '~21:00',
        title: 'Найти первый Travel Passport',
        kind: 'quest',
        details: ['От Ebisu Bridge пройти около трёх минут по Shinsaibashi-suji до DAISO Shinsaibashi-suji 2-chome, 3F. Он открыт до 22:00 — это маленькая вечерняя миссия без крюка.', 'Выбрать маленький блокнот A6/B6 с плотной обложкой и клеткой или точками: 方眼ノート (hōgan nōto) / ドット方眼. Добавить одну наклейку シール и любимую ручку — это и будет ваш настоящий Travel Passport.', 'На первой странице написать: “30.09.2026 · Osaka · 旅” и вклеить карточку с первой печатью KIX. Eki stamp собирайте сюда; goshuin для храмов всегда живут в отдельной goshuincho-книжке.'],
      },
      {
        id: 'shinsaibashi-night',
        time: 'После ужина',
        title: 'Закрыть первый японский вечер',
        kind: 'place',
        details: ['Пройти через Shinsaibashi-suji, заглянуть в konbini по пути и вернуться в отель примерно к 23:00.', 'Проверить прогноз на завтра и собрать всё к раннему выходу. Выйти в 06:50, билет Kuroshio уже куплен.'],
      },
    ],
  },
  {
    id: 'shirahama',
    date: '2026-10-01',
    dateLabel: '1 октября',
    city: 'Shirahama',
    eyebrow: 'Глава 02 · Океан',
    title: 'К белому берегу',
    subtitle: 'Тихий океан, скалы и игровой вечер в Osaka',
    vibe: dayVibe('gentle', 'Чиловый', 'День с воздухом', 'Здесь не надо собирать все точки: океан, свободный обед и одна спокойная вечерняя остановка уже делают день полным.', 'Оставь себе длинную паузу у воды.', '🌊'),
    cover: cover.osaka,
    mapFile: '2026-10-01-shirahama.html',
    mapRouteScenes: [['early-breakfast'], ['train-shirahama'], ['train-shirahama', 'stamp-shirahama'], ['beach'], ['seafood'], ['coast'], ['coast'], ['coast'], ['parco'], ['osaka-zagin']],
    achievementId: 'touch-the-pacific',
    achievementTitle: 'Touch the Pacific',
    claimLabel: 'Я коснулась Тихого океана',
    fact: 'Название Shirarahama буквально отсылает к белому песчаному берегу — именно ради него сегодня путь уходит далеко на юг.',
    riddle: {
      question: 'На сколько метров лифт уносит вниз к пещере Sandanbeki?',
      hint: 'Число можно заметить у входа или внутри лифта.',
      options: ['12 метров', '24 метра', '36 метров', '50 метров'],
      answer: 2,
      explanation: 'Лифт спускается на 36 метров — к пещере, которую Тихий океан выточил под скалами.',
      location: 'Sandanbeki · вход в пещеру и лифт',
    },
    timeline: [
      { id: 'early-breakfast', time: '06:50', title: 'Собрать завтрак охотника за океаном', kind: 'food', food: freeFood('Завтрак', 'Egg sando, onigiri и кофе — всё остальное сделает поезд.', 'По дороге к Tennoji'), details: [] },
      { id: 'train-shirahama', time: '07:59', title: 'Сбежать из города к океану', kind: 'route', details: ['Kuroshio 1 отправляется из Tennoji и через два часа привозит к белому берегу.'] },
      { id: 'stamp-shirahama', time: 'По прибытии', title: 'Найти печать с запахом океана', kind: 'quest', details: ['На Shirahama Station найти Eki Stamp #2, поставить его в туристический блокнот и отметить вторую находку в Passport приложения.'] },
      { id: 'beach', time: 'До обеда', title: 'Коснуться Тихого океана', kind: 'quest', details: ['Разуться, выйти на белый песок и проверить, действительно ли океан холодный.'] },
      { id: 'seafood', time: 'Когда проголодаешься', title: 'Выбрать обед у океана', kind: 'food', food: freeFood('Обед', 'Seafood, kaisendon, sashimi или рыба дня — выбрать то, что выглядит самым свежим именно сейчас.', 'Shirahama'), details: [] },
      { id: 'coast', time: 'После обеда', title: 'Пройти по краю мира', kind: 'place', details: ['Senjojiki и Sandanbeki — ветер, утёсы и океан без конца.'] },
      { id: 'parco', time: 'Вечером', title: 'Вернуться в мир игр перед отдыхом', kind: 'place', details: ['После берега вернуться в Osaka и выбрать один главный магазин — Kojima Productions или TORCH TORCH.', 'После этого без новых точек вернуться в отель, зарядить телефоны и приготовить QR-билеты к завтрашнему USJ.'] },
      { id: 'osaka-zagin', time: 'После магазинов', title: 'Завершить день ramen', kind: 'food', food: primaryFood('Ужин', 'Torisoba Zagin Niboshi', 'Ramen с niboshi — спокойная тёплая точка после длинной дороги.', undefined, 'Можно спокойно выбрать другой ramen рядом.'), details: [] },
    ],
  },
  {
    id: 'usj',
    date: '2026-10-02',
    dateLabel: '2 октября',
    city: 'Osaka',
    eyebrow: 'Глава 03 · Другой мир',
    title: 'Портал открыт',
    subtitle: 'USJ, Frieren и Halloween Horror Nights',
    vibe: dayVibe('full', 'Насыщенный', 'Один большой мир', 'Сегодня весь день живёт внутри USJ — не нужно ничего успевать за пределами парка.', 'Express Pass задаёт ритм; между слотами просто живите в парке.', '🎢'),
    cover: cover.osaka,
    mapFile: '2026-10-02-usj.html',
    mapRouteScenes: [['to-usj'], ['to-usj'], ['to-usj', 'usj-entry'], ['harry-potter'], ['express-missions'], ['frieren-lunch'], ['express-missions'], ['halloween'], ['jurassic'], ['usj-home']],
    achievementId: 'another-world',
    achievementTitle: 'Another World',
    claimLabel: 'Главная миссия USJ выполнена',
    fact: 'Время выхода зависит от официального открытия USJ: цель — оказаться у ворот за 45–60 минут.',
    riddle: {
      question: 'Сколько мётел нужно найти на вывеске Three Broomsticks?',
      hint: 'Не переводи название — найди саму вывеску в деревне волшебников.',
      options: ['Одну', 'Две', 'Три', 'Четыре'],
      answer: 2,
      explanation: 'На вывеске собрались три метлы — иначе заведению пришлось бы менять название.',
      location: 'USJ · Hogsmeade, таверна Three Broomsticks',
    },
    timeline: [
      { id: 'to-usj', time: 'До открытия', title: 'Добраться до портала раньше толпы', kind: 'route', details: ['К воротам USJ стоит прийти за час — другие миры не любят опоздавших.'] },
      { id: 'usj-entry', time: 'Первым делом', title: 'Активировать магию Frieren', kind: 'quest', details: ['Покажи QR и сразу забери в приложении Frieren Story Walk eTicket на двоих.'] },
      { id: 'harry-potter', time: 'Утром', title: 'Выпить сливочного пива в Hogsmeade', kind: 'place', details: ['Потом можно проверить, насколько запретное путешествие действительно Forbidden.'] },
      { id: 'express-missions', time: 'Весь день', title: 'Собрать четыре мира за один день', kind: 'quest', details: ['Зомби, Frieren, Chainsaw Man и один очень быстрый Hollywood Dream.'] },
      { id: 'frieren-lunch', time: '~12:30–14:00', title: 'Зайти в Restaurant of Memories', kind: 'food', food: primaryFood('Обед', 'Restaurant of Memories', 'Коллаборационное блюдо или десерт из мира Frieren.', undefined, 'Можно спокойно выбрать другое место в парке рядом с текущей зоной.'), details: ['Перед заказом свериться со временем следующего слота Express Pass.'] },
      { id: 'halloween', time: 'После 18:00', title: 'Дождаться, пока парк станет страшным', kind: 'place', details: ['Street Zombies и Zombie de Dance начинаются только после темноты.'] },
      { id: 'jurassic', time: '20:00', title: 'Прокатиться среди динозавров во тьме', kind: 'quest', details: ['Кульминация паркового дня — Jurassic Park in the Dark. После неё портал уже можно закрывать.'] },
      { id: 'usj-home', time: 'После 20:30', title: 'Закрыть портал и вернуться домой', kind: 'route', details: ['Universal City → JR Yumesaki Line до Nishikujo → Osaka Loop Line до Taisho.', 'На Taisho пересесть в Osaka Metro Nagahori Tsurumi-ryokuchi Line и доехать до Nagahoribashi. Дальше — Grand Hostel, душ, зарядка телефонов и никаких новых миссий.'] },
    ],
  },
  {
    id: 'nara',
    date: '2026-10-03',
    dateLabel: '3 октября',
    city: 'Nara',
    eyebrow: 'Глава 04 · Посланники леса',
    title: 'Выбрана Нара',
    subtitle: 'Олени, Великий Будда и вечер с Pokémon',
    vibe: dayVibe('steady', 'Живой', 'Нара, потом Osaka', 'Утро принадлежит храмам и оленям, вечер — Pokémon. Между ними не нужно бороться за идеальный темп.', 'Pokémon Café — единственный жёсткий якорь; Shinsekai можно сократить до еды и огней.', '🦌'),
    cover: cover.osaka,
    mapFile: '2026-10-03-nara.html',
    mapRouteScenes: [['to-nara'], ['to-nara'], ['nara-park'], ['todaiji'], ['kasuga'], ['nara-food'], ['nara-food'], ['nara-food'], ['pokemon-osaka'], ['shinsekai-food'], ['shinsekai-night']],
    achievementId: 'chosen-by-nara',
    achievementTitle: 'Chosen by Nara',
    claimLabel: 'Я покормила оленя',
    fact: 'Shika senbei — специальные рисовые крекеры для оленей. Держи их спокойно и не прячь за спиной.',
    riddle: {
      question: 'Какой части Великого Будды равен лаз в деревянной колонне?',
      hint: 'Ищи колонну с отверстием внизу внутри Daibutsuden.',
      options: ['Уху', 'Глазу', 'Ноздре', 'Ладони'],
      answer: 2,
      explanation: 'Говорят, отверстие совпадает по размеру с ноздрёй Великого Будды.',
      location: 'Tōdai-ji · зал Daibutsuden, колонна позади статуи',
    },
    timeline: [
      { id: 'to-nara', time: 'Рано утром', title: 'Уехать туда, где олени важнее машин', kind: 'route', details: ['Rapid Express довезёт до Kintetsu-Nara примерно к девяти.'] },
      { id: 'nara-park', time: 'Первая встреча', title: 'Заслужить поклон оленя', kind: 'quest', details: ['Купи shika senbei и приготовься мгновенно стать самой популярной в парке.'] },
      { id: 'todaiji', time: 'Утром', title: 'Поздороваться с Великим Буддой', kind: 'place', details: ['Пройди через огромные ворота Nandaimon к Daibutsuden.', 'Сразу за Tōdai-ji подняться к Nigatsudō: деревянная терраса, крыши Nara и около 20–25 минут без билета. Оттуда естественная дорожка ведёт дальше к Kasuga Taisha — это часть прогулки, а не отдельный крюк.'] },
      { id: 'kasuga', time: 'До обеда', title: 'Сосчитать фонари и сбиться', kind: 'place', details: ['Каменные и бронзовые фонари Kasuga Taisha специально не хотят считаться.'] },
      { id: 'nara-food', time: 'После полудня', title: 'Сделать паузу в Нара', kind: 'food', food: primaryFood('Обед', 'Mizuya Chaya', 'Чайный домик для спокойной паузы между храмами и прогулкой.', [{ name: 'Nakatanidou', note: 'Свежий yomogi mochi — сладкий перекус, если будете в Naramachi.' }], 'Можно спокойно выбрать другое место рядом.'), details: [] },
      { id: 'pokemon-osaka', time: '~18:00', title: 'Зайти в мир Pokémon', kind: 'quest', details: ['Прийти по брони в Pokémon Café Osaka на 9F Daimaru Shinsaibashi и спокойно прожить эту тематическую остановку отдельно от остального вечера.', 'Можно взять напиток или десерт по настроению и оставить место для еды в Shinsekai.'] },
      { id: 'shinsekai-food', time: '~19:30', title: 'Попробовать вечерний Shinsekai', kind: 'food', food: primaryFood('Перекус / еда вечером', 'Shinsekai Kawachiya Honten', 'Kushikatsu в самом подходящем для него районе.', [{ name: 'Daruma', note: 'Kushikatsu, если Kawachiya не подойдёт.' }], 'Можно спокойно выбрать другое место рядом в Shinsekai.'), details: [] },
      { id: 'shinsekai-night', time: 'После еды', title: 'Отпустить маршрут в вечернем Shinsekai', kind: 'rest', details: ['Погулять под огнями Tsutenkaku, посмотреть ретро-вывески и никуда специально не торопиться.', 'Поехать домой, когда захочется.'] },
    ],
  },
  {
    id: 'kyoto-arrival',
    date: '2026-10-04',
    dateLabel: '4 октября',
    city: 'Kyoto',
    eyebrow: 'Глава 05 · Старая столица',
    title: 'По следам дракона',
    subtitle: 'Kiyomizu-dera, Gion и первая запись goshuin',
    vibe: dayVibe('gentle', 'Чиловый', 'Медленный Kyoto', 'День собран как прогулка, а не как чек-лист: улицы, check-in, вечерние фонари и домашний ужин.', 'После заселения ничего не нужно догонять.', '🍂'),
    cover: cover.kyoto,
    mapFile: '2026-10-04-kyoto-gion.html',
    mapRouteScenes: [['move-kyoto'], ['move-kyoto'], ['move-kyoto', 'stamp-gion'], ['tazuru-bags'], ['kiyomizu'], ['old-streets'], ['old-streets'], ['old-streets'], ['gion'], ['tazuru-checkin'], ['gion-evening'], ['gion-evening'], ['gion-evening'], ['kaiseki']],
    achievementId: 'the-old-capital',
    achievementTitle: 'The Old Capital',
    claimLabel: 'Первый знак Kyoto открыт',
    fact: 'Goshuin оформляет служитель в отдельной книжке goshuincho. Это храмовая коллекция: к Travel Passport и станционным Eki stamp она не относится.',
    riddle: {
      question: 'Сколько драконов кружат на огромном потолке Kennin-ji?',
      hint: 'Войди в Dharma Hall и не забудь посмотреть вверх.',
      options: ['Один', 'Два', 'Три', 'Четыре'],
      answer: 1,
      explanation: 'Это «Twin Dragons» — пара драконов на потолке зала.',
      location: 'Kennin-ji · Dharma Hall / Hattō',
    },
    timeline: [
      { id: 'move-kyoto', time: 'После завтрака', title: 'Сменить неон на старую столицу', kind: 'route', details: ['Keihan увезёт прямо к Gion-Shijo — там начинается новая глава.'] },
      { id: 'stamp-gion', time: 'На станции', title: 'Поставить печать Kyoto', kind: 'quest', details: ['На Gion-Shijo Station найти Eki Stamp #3, поставить его в туристический блокнот и отметить третью находку в Passport приложения.'] },
      { id: 'tazuru-bags', time: 'Перед прогулкой', title: 'Оставить чемоданы и стать налегке', kind: 'rest', details: ['Tazuru приютит вещи до check-in.'] },
      { id: 'kiyomizu', time: 'До обеда', title: 'Начать отдельную книгу goshuin', kind: 'quest', details: ['У Kiyomizu-dera купить goshuincho — специальную книжку только для записей из храмов и святилищ.', 'Показать её в окне goshuin: служитель сам добавит каллиграфию и красную печать. В туристический блокнот это не ставится и в счётчик Eki stamp не входит.'] },
      { id: 'old-streets', time: 'После храма', title: 'Потеряться в старых улочках', kind: 'place', details: ['Sannenzaka, Ninenzaka, пагода и столько matcha-сладостей, сколько захочется.', 'По пути обратить внимание на Yasaka Kōshin-dō с разноцветными kukurizaru — 5–10 минут на тихий кадр. Затем просто пройти Ishibe-kōji: короткая каменная улочка по дороге к Gion. Никаких отдельных обязательных остановок.'] },
      { id: 'gion', time: '~15:40–16:40', title: 'Найти драконов Gion', kind: 'place', details: ['Зайти в Kennin-ji и посмотреть на пару огромных драконов на потолке Dharma Hall. После храма вернуться к Tazuru — он находится рядом.'] },
      { id: 'tazuru-checkin', time: '~17:00', title: 'По-настоящему заселиться в Kyoto', kind: 'rest', details: ['Вернуться в Tazuru, пройти check-in, забрать оставленные утром чемоданы и отнести вещи в номер.', 'Взять ключ, проверить самое нужное и сделать короткую паузу перед вечерней прогулкой.'] },
      { id: 'gion-evening', time: 'После check-in', title: 'Выйти к вечерним фонарям Gion', kind: 'place', details: ['Пройти через Hanamikoji к Yasaka Shrine, а затем выйти к тихому каналу Gion Shirakawa.', 'Это уже спокойная прогулка без багажа; к ужину перейти в Pontocho.'] },
      { id: 'kaiseki', time: '~18:30', title: 'Поужинать по-домашнему в Kyoto', kind: 'food', food: primaryFood('Ужин', 'Mamaya', 'Домашняя Kyoto-кухня и obanzai — спокойно, без формата специального ужина.', undefined, 'Можно спокойно выбрать другое место рядом в Pontocho.'), details: ['После Pontocho неспешно пройти вдоль Kamo River и вернуться в Tazuru.'] },
    ],
  },
  {
    id: 'fushimi',
    date: '2026-10-05',
    dateLabel: '5 октября',
    city: 'Kyoto',
    eyebrow: 'Глава 06 · Тысяча врат',
    title: 'Дорога сквозь тории',
    subtitle: 'Fushimi Inari, Nishiki и замок Nijo',
    vibe: dayVibe('full', 'Насыщенный', 'Большой Kyoto', 'Много красивых глав за один день, но вечер специально оставлен гибким.', 'Если утро затянулось, первая на пропуск — маленькая находка, а не отдых.', '🦊'),
    cover: cover.kyoto,
    mapFile: '2026-10-05-fushimi-inari.html',
    mapRouteScenes: [['to-fushimi'], ['to-fushimi'], ['to-fushimi', 'fushimi-main'], ['fushimi-main'], ['sanjusangendo'], ['nishiki'], ['nijo'], ['gion-matcha'], ['gion-matcha'], ['kyoto-ramen'], ['kyoto-night-finale']],
    achievementId: 'a-thousand-gates',
    achievementTitle: 'A Thousand Gates',
    claimLabel: 'Миссия Senbon Torii завершена',
    fact: 'Senbon Torii переводится как «тысяча ворот тории» — это знаменитый коридор красных врат Fushimi Inari.',
    riddle: {
      question: 'Пение какой птицы напоминают полы дворца Ninomaru?',
      hint: 'Ответ прячется не в картине — прислушайся к полу под ногами.',
      options: ['Журавля', 'Соловья', 'Совы', 'Воробья'],
      answer: 1,
      explanation: 'Скрипучие коридоры называют «соловьиными полами» — uguisubari.',
      location: 'Nijo Castle · коридоры Ninomaru Palace',
    },
    timeline: [
      { id: 'to-fushimi', time: 'Пока город спит', title: 'Уехать к лисьей горе', kind: 'route', details: ['Ранний Keihan — лучший шанс увидеть Fushimi Inari почти без толпы.'] },
      { id: 'fushimi-main', time: 'Утром', title: 'Пройти сквозь тысячу красных врат', kind: 'quest', details: ['Поднимайся через Senbon Torii до Yotsutsuji, пока Kyoto раскрывается внизу.'] },
      { id: 'sanjusangendo', time: 'После спуска', title: 'Встретить тысячу и одну статую', kind: 'place', details: ['В длинном зале Sanjusangendo попробуй найти две одинаковые.'] },
      { id: 'nishiki', time: 'В обед', title: 'Собрать обед по кусочкам', kind: 'food', food: freeFood('Обед', 'Один tamagoyaki, кусочек свежей рыбы, что-нибудь жареное и wagashi на счастье.', 'Nishiki Market'), details: ['На выходе из Nishiki, если хочется ещё одну маленькую странность Kyoto: зайти на 10 минут в Nishiki Tenmangū. Там есть karakuri omikuji — лев-робот выдаёт предсказание, обычно около ¥200 и есть английский вариант. Это omikuji, не goshuin и не печать в Travel Passport.'] },
      { id: 'nijo', time: 'После рынка', title: 'Проверить, поют ли полы замка', kind: 'place', details: ['Прогулка через Ninomaru Palace и сады Nijo.'] },
      { id: 'gion-matcha', time: 'Под вечер', title: 'Сделать matcha-паузу в Gion', kind: 'food', food: primaryFood('Матча', 'Saryo Tsujiri Gion Honten', 'Matcha-пауза перед вечерней прогулкой.', [{ name: 'Nakamura Tokichi', note: 'Зелёный parfait, если захочется именно десерт.' }], 'Можно спокойно выбрать другое matcha-место рядом.'), details: ['После паузы пройти через Teramachi или Shinkyogoku.'] },
      { id: 'kyoto-ramen', time: 'К ужину', title: 'Закрыть день ramen', kind: 'food', food: primaryFood('Ужин', 'Menya Inoichi', 'Dashi ramen для простого, тёплого финала дня.', [{ name: 'Menya Inoichi Hanare', note: 'Вариант dashi ramen, который уже был в маршруте.' }], 'Можно спокойно выбрать другой ramen рядом.'), details: [] },
      { id: 'kyoto-night-finale', time: 'Когда захочется', title: 'Выбрать, как закончится Kyoto', kind: 'rest', details: ['Если силы закончились — спокойно возвращайтесь в Tazuru: душ, чай и отдых уже будут правильным финалом большого дня.', 'Если хочется ещё немного Kyoto — сделайте короткий круг вдоль Kamo River или по тихим вечерним улицам, не добавляя новых обязательных точек. После этого — домой в Tazuru.'] },
    ],
  },
  {
    id: 'arashiyama',
    date: '2026-10-06',
    dateLabel: '6 октября',
    city: 'Kyoto',
    eyebrow: 'Глава 07 · После заката',
    title: 'Тихий Arashiyama',
    subtitle: 'Бамбуковая роща, каменные лица и свет кимоно',
    vibe: dayVibe('adventure', 'Прогулочный', 'Длинная прогулка', 'День для ног и глаз: горы, бамбук, каменные лица, а вечером — мягкий свет станции.', 'Устали — режем одну точку, а не последний спокойный вечер.', '🎋'),
    cover: cover.kyoto,
    mapFile: '2026-10-06-arashiyama.html',
    mapRouteScenes: [['to-arashiyama'], ['to-arashiyama'], ['to-arashiyama', 'bridge-bamboo'], ['bridge-bamboo'], ['tenryuji'], ['tenryuji'], ['tenryuji'], ['tofu-lunch'], ['otagi'], ['otagi'], ['kimono-forest'], ['obanzai']],
    achievementId: 'kyoto-after-dark',
    achievementTitle: 'Kyoto After Dark',
    claimLabel: 'Я увидела Kimono Forest в огнях',
    fact: 'В Otagi Nenbutsu-ji около 1200 каменных rakan, и у каждой статуи своё лицо и настроение.',
    riddle: {
      question: 'Что спрятано внутри прозрачных светящихся колонн Kimono Forest?',
      hint: 'Подойди к одной колонне близко и рассмотри узор.',
      options: ['Ткань для кимоно', 'Рисовая бумага', 'Цветное стекло', 'Засушенные цветы'],
      answer: 0,
      explanation: 'Внутри находится ткань с традиционными узорами Kyo-yuzen.',
      location: 'Randen Arashiyama Station · Kimono Forest',
    },
    timeline: [
      { id: 'to-arashiyama', time: 'На рассвете', title: 'Сбежать в горы', kind: 'route', details: ['Тихий поезд довезёт до Arashiyama раньше основной толпы.'] },
      { id: 'bridge-bamboo', time: 'Первым делом', title: 'Услышать, как шепчет бамбук', kind: 'place', details: ['Начни у моста Togetsukyo и войди в рощу, пока она ещё сонная.'] },
      { id: 'tenryuji', time: 'Утром', title: 'Собрать три самых спокойных вида', kind: 'place', details: ['Сад Tenryu-ji, чай Okochi Sanso и река Hozu сверху.'] },
      { id: 'tofu-lunch', time: 'В обед', title: 'Сделать soba-паузу в Arashiyama', kind: 'food', food: primaryFood('Обед', 'Arashiyama Yoshimura', 'Soba и вид на Arashiyama.', [{ name: 'Yudofu', note: 'Тёплый tofu-обед, если захочется более спокойной классики Kyoto.' }], 'Можно спокойно выбрать другое место рядом.'), details: [] },
      { id: 'otagi', time: 'После обеда', title: 'Найти каменное лицо с твоим настроением', kind: 'quest', details: ['В Otagi живут 1200 rakan — один из них точно похож на тебя сегодня.'] },
      { id: 'kimono-forest', time: 'Под вечер', title: 'Дождаться, когда зажжётся лес кимоно', kind: 'quest', details: ['Световые колонны Kimono Forest — вечерняя магия Arashiyama перед возвращением в центр Kyoto.', 'Если подойдёте к Randen Arashiyama Station примерно до 17:20: устроить паузу в station footbath на 15–20 минут — полотенце входит, билет берётся в information. Последний приём сейчас указан в 17:30, поэтому без бега: опоздали — просто идём к огням.', 'Там же появилась лимитированная Arashiyama purikura с рамками Kimono Forest. На неё хватит 5–10 минут; если очередь или время поджимает, не пытаемся успеть всё — footbath важнее, а purikura остаётся милым бонусом.'] },
      { id: 'obanzai', time: 'Вечером', title: 'Поужинать и отпустить Kyoto до утра', kind: 'food', food: primaryFood('Ужин', 'Keiraku Yakiniku Yabu', 'Yakiniku после длинного дня в Arashiyama.', [{ name: 'Obanzai в Kawaramachi', note: 'Несколько сезонных блюд, если захочется более спокойного вечера.' }], 'Можно спокойно выбрать другое место рядом.'), details: ['После ужина можно сразу вернуться в Tazuru или сделать один короткий круг вдоль Kamo River. Новых обязательных точек на сегодня нет.'] },
    ],
  },
  {
    id: 'hello-tokyo',
    date: '2026-10-07',
    dateLabel: '7 октября',
    city: 'Tokyo',
    eyebrow: 'Глава 08 · Новый горизонт',
    title: 'Hello, Tokyo',
    subtitle: 'Shinkansen и первый аниме-кадр Tokyo',
    vibe: dayVibe('gentle', 'Лёгкий', 'Перезагрузка в Tokyo', 'После Kyoto у этого дня одна задача: мягко переехать, увидеть первый вечер Tokyo и лечь отдыхать.', 'Tokyo Tower и ужин — уже достаточно.', '🗼'),
    cover: cover.tokyo,
    mapFile: '2026-10-07-kyoto-to-tokyo.html',
    mapRouteScenes: [['kyoto-station'], ['kyoto-station'], ['matcha-ekiben'], ['shinkansen'], ['tokyo-checkin'], ['shiba'], ['shiba'], ['tower'], ['jangara']],
    achievementId: 'hello-tokyo',
    achievementTitle: 'Hello, Tokyo',
    claimLabel: 'Первый знак Tokyo открыт',
    fact: 'Ekiben — вокзальный бенто, придуманный именно для поездки. Сегодня он становится обедом в Shinkansen.',
    riddle: {
      question: 'Что крутится в руках у маленьких каменных Jizō рядом с Zojo-ji?',
      hint: 'Ищи ряды маленьких статуй сбоку от основного храмового пространства.',
      options: ['Зонтики', 'Вертушки', 'Фонарики', 'Колокольчики'],
      answer: 1,
      explanation: 'Рядом с Jizō вращаются цветные вертушки, оставленные семьями вместе с одеждой и игрушками.',
      location: 'Zojo-ji · сад со статуями Jizō',
    },
    timeline: [
      { id: 'kyoto-station', time: 'Утром', title: 'Попрощаться с Kyoto', kind: 'route', details: ['Последний короткий путь к Kyoto Station — и старая столица остаётся позади.'] },
      { id: 'matcha-ekiben', time: 'Перед поездом', title: 'Собрать идеальный набор в Shinkansen', kind: 'food', food: freeFood('Завтрак / в дорогу', 'Matcha-десерт сейчас, красивый ekiben — с собой.', 'Kyoto Station'), details: [] },
      { id: 'shinkansen', time: 'Около 12:30', title: 'Промчаться через Японию', kind: 'route', details: ['Nozomi доставит из Kyoto в Shinagawa быстрее, чем закончится ощущение дороги.'] },
      { id: 'tokyo-checkin', time: 'После прибытия', title: 'Оставить вещи в новом доме', kind: 'rest', details: ['Небольшая пауза в Shiba перед первым вечером Tokyo.'] },
      { id: 'shiba', time: 'Ближе к закату', title: 'Войти в кадр Weathering With You', kind: 'quest', details: ['Пройди через Zojo-ji к большой лужайке Shiba Park. У края поля найди ракурс, где Tokyo Tower остаётся слева, а крыша храма видна ближе к центру — почти как в фильме.'] },
      { id: 'tower', time: 'Когда зажгутся огни', title: 'Подняться ближе к небу', kind: 'quest', details: ['Поднимись на Main Deck и дождись первых огней. Отметь обе точки — парк и башню — чтобы закрыть аниме-миссию.'] },
      { id: 'jangara', time: 'После башни', title: 'Закрепить знакомство с Tokyo ramen', kind: 'food', food: primaryFood('Ужин', 'MEN Cry', 'Ramen для первого спокойного вечера в Tokyo.', [{ name: 'Jangara', note: 'Tonkotsu ramen, который уже был в маршруте.' }], 'Можно спокойно выбрать другой ramen рядом.'), details: ['После переезда из Kyoto и первого вечера Tokyo этого достаточно: дальше только отдых в новом доме.'] },
    ],
  },
  {
    id: 'shibuya-story',
    date: '2026-10-08',
    dateLabel: '8 октября',
    city: 'Tokyo',
    eyebrow: 'Глава 09 · Живая сказка',
    title: 'От леса к неону',
    subtitle: 'Meiji, две аниме-миссии и неоновый Shibuya',
    vibe: dayVibe('full', 'Насыщенный', 'Большой Tokyo', 'День яркий и длинный: лес, улицы, Shibuya Sky и ночной Shinjuku.', 'Shibuya Sky — якорь; если день поплыл, сокращаем аниме-детур или магазины.', '🌃'),
    cover: cover.tokyo,
    mapFile: '2026-10-08-harajuku-shibuya.html',
    mapRouteScenes: [['meiji'], ['meiji'], ['meiji'], ['jujutsu-route'], ['harajuku'], ['harajuku'], ['suga-steps'], ['gyukatsu'], ['shibuya'], ['shibuya'], ['shibuya'], ['shibuya'], ['shibuya-sky'], ['shinjuku-night'], ['shinjuku-night'], ['shinjuku-night'], ['ramen-nagi']],
    achievementId: 'into-the-storybook',
    achievementTitle: 'Into the Storybook',
    claimLabel: 'Я прошла от леса до ночных огней',
    fact: 'Сегодня маршрут специально меняет настроение: тишина лесной дороги Meiji Jingu постепенно превращается в неон Kabukicho.',
    riddle: {
      question: 'Бочки с каким напитком стоят напротив японских sake barrels?',
      hint: 'Найди две стены бочек на лесной дороге к святилищу.',
      options: ['С зелёным чаем', 'С пивом', 'С французским вином', 'С минеральной водой'],
      answer: 2,
      explanation: 'Напротив sake стоят бочки французского вина — знак дружбы Японии и Франции.',
      location: 'Meiji Jingu · главная дорога к святилищу',
    },
    timeline: [
      { id: 'meiji', time: 'Утром', title: 'Начать день в лесу посреди мегаполиса', kind: 'place', details: ['Большие torii, тишина Meiji Jingu и первый спокойный вдох Tokyo.'] },
      { id: 'jujutsu-route', time: 'На выходе к городу', title: 'Открыть свою главу Jujutsu Kaisen', kind: 'quest', details: ['Заметь название Meiji-jingumae, а позже закрой миссию среди экранов и переходов Shibuya. Нужен не точный кадр, а ощущение знакомого города — и никакой остановки посреди людского потока.'] },
      { id: 'harajuku', time: 'После тишины', title: 'Выйти из леса прямо в Harajuku', kind: 'place', details: ['Takeshita, Omotesando и Cat Street — смена миров за одну прогулку.'] },
      { id: 'suga-steps', time: 'До Shibuya', title: 'Встретиться на ступенях из «Твоего имени»', kind: 'quest', details: ['Сделай короткий прыжок до Yotsuya-sanchome и найди внешнюю лестницу Suga Shrine с красными перилами. Это тихий жилой уголок: один спокойный кадр — и дальше в путь.'] },
      { id: 'gyukatsu', time: 'После возвращения в Shibuya', title: 'Выбрать обед по настроению', kind: 'food', food: moodFood('Обед', [{ name: 'Tsukishima Monja Okoge Shibuya', note: 'Monjayaki' }, { name: 'Gyukatsu Motomura Shibuya', note: 'Gyukatsu — обжарить кусочки на камне.' }]), details: [] },
      { id: 'shibuya', time: 'После обеда', title: 'Перейти самый знаменитый перекрёсток', kind: 'place', details: ['Поздоровайся с Hachiko, а потом отправляйся собирать мерч в PARCO.'] },
      { id: 'shibuya-sky', time: 'Вход 16:20–16:40', title: 'Поймать Tokyo между днём и ночью', kind: 'quest', details: ['Поднимись на SHIBUYA SKY до заката и останься до первых огней.'] },
      { id: 'shinjuku-night', time: 'После заката', title: 'Пойти туда, где живёт Godzilla', kind: 'place', details: ['Yakitori, Kabukicho и огромная голова над ночным Shinjuku.'] },
      { id: 'ramen-nagi', time: 'Финал', title: 'Найти ramen в переулках Golden Gai', kind: 'food', food: primaryFood('Ужин', 'Nagi Golden Gai', 'Насыщенный niboshi-бульон — тёплый финал очень длинного дня.', undefined, 'Если очередь слишком большая, ближайший уютный ramen будет не менее правильным финалом.'), details: ['После ужина сесть на Oedo Line до Daimon и спокойно идти домой.'] },
    ],
  },
  {
    id: 'fuji',
    date: '2026-10-09',
    dateLabel: '9 октября',
    city: 'Fuji',
    eyebrow: 'Глава 10 · Гора появляется',
    title: 'Fuji Found!',
    subtitle: 'Chureito, Lake Kawaguchi и вид с канатной дороги',
    vibe: dayVibe('adventure', 'Приключенческий', 'Охота за Fuji', 'Погода здесь главнее маршрута: когда гора показалась — можно остановиться и просто смотреть.', 'Не видно Fuji или выбились из графика — бонусные точки отпускаем сразу.', '🗻'),
    cover: cover.fuji,
    mapFile: '2026-10-09-fuji.html',
    mapRouteScenes: [['fuji-train'], ['fuji-train'], ['fuji-train'], ['fuji-train'], ['chureito'], ['chureito'], ['houtou'], ['houtou'], ['oishi'], ['ropeway'], ['ropeway'], ['fuji-return']],
    achievementId: 'fuji-found',
    achievementTitle: 'Fuji Found!',
    claimLabel: 'Я увидела Fuji',
    fact: 'Этот контент можно целиком перенести на 11 октября, если видимость Fuji будет плохой. Награда переедет вместе с ним.',
    riddle: {
      question: 'Сколько ступеней отделяют начало подъёма от вида у Chureito?',
      hint: 'Число можно найти на указателе — или честно досчитать ногами.',
      options: ['108', '333', '398', '500'],
      answer: 2,
      explanation: 'До площадки ведут 398 каменных ступеней. Теперь каждая точно заслужена.',
      location: 'Arakurayama Sengen Park · лестница к Chureito',
    },
    timeline: [
      { id: 'fuji-train', time: 'Очень рано', title: 'Уехать на охоту за горой', kind: 'route', details: ['Fuji Excursion 3 стартует из Shinjuku в 07:30 — дальше всё решают облака.'] },
      { id: 'chureito', time: 'Первое испытание', title: 'Подняться к виду с открытки', kind: 'quest', details: ['Ступени к Chureito Pagoda приводят к тому самому кадру с Fuji.', 'Если Fuji открыта и идёте по графику, на спуске сделать ещё один короткий кадр на Honchō Street у Shimoyoshida: около 15 минут, обычные вывески и гора в конце улицы. Фото — только с тротуара: это жилой район и на проезжую часть выходить нельзя. Если облака или задержались, спокойно пропустить.'] },
      { id: 'houtou', time: 'После подъёма', title: 'Согреться локальным hōtō', kind: 'food', food: primaryFood('Обед', 'Hoto Fudo Kawaguchiko Station', 'Hōtō — местная лапша Yamanashi с овощами и miso-бульоном.', undefined, 'Можно спокойно выбрать другое место рядом со станцией.'), details: [] },
      { id: 'oishi', time: 'После обеда', title: 'Встретиться с Fuji у воды', kind: 'place', details: ['В Oishi Park между тобой и горой остаётся только озеро.'] },
      { id: 'ropeway', time: 'Перед вечером', title: 'Подняться ещё выше', kind: 'place', details: ['Канатная дорога покажет сразу и Fuji, и Lake Kawaguchi.'] },
      { id: 'fuji-return', time: '17:41', title: 'Увезти гору с собой', kind: 'route', details: ['Сесть у окна Fuji Excursion 48 и пересматривать фотографии до Tokyo.', 'После прибытия в Shinjuku вернуться к Hamamatsucho, оставить вещи и решить, сколько сил осталось на вечер.'] },
      { id: 'fuji-evening', time: 'Когда вернётесь', title: 'Оставить вечер только для вас', kind: 'rest', details: ['Если силы ещё есть — выйти на короткую прогулку без маршрута: тихие улицы Hamamatsucho, знакомый огонь Tokyo Tower или случайный konbini по дороге.', 'Если день забрал всё — сразу домой, душ, фотографии Fuji и отдых. Ничего догонять не нужно: оба варианта считаются правильным финалом.'] },
    ],
  },
  {
    id: 'ginza-akihabara',
    date: '2026-10-10',
    dateLabel: '10 октября',
    city: 'Tokyo',
    eyebrow: 'Глава 11 · Электрический город',
    title: 'Tokyo Explorer',
    subtitle: 'Tsukiji, покупки в Ginza и аниме-маршрут по Akihabara',
    vibe: dayVibe('steady', 'Живой', 'Городской explorer', 'Утро про вкус и покупки, вторая половина — про одну большую охоту в Akihabara.', 'Если JINS или покупки съели время, просто начинаем Akihabara позже и заканчиваем раньше.', '⚡'),
    cover: cover.tokyo,
    mapFile: '2026-10-10-ginza-akihabara.html',
    mapNote: 'Повторный заход в JINS отмечен в карточке точки JINS; расписание сцен выше остаётся главным.',
    mapRouteScenes: [['tsukiji-breakfast'], ['tsukiji-breakfast'], ['ginza-walk', 'jins'], ['apple-ginza'], ['uniqlo-sushi'], ['jins-pickup'], ['sushi-midori'], ['ginza-to-akihabara', 'stamp-akihabara'], ['kanda-myojin-anime'], ['steins-gate-line'], ['steins-gate-line'], ['akihabara'], ['akihabara'], ['akihabara'], ['akihabara'], ['akiba-night', 'akiba-lights'], ['akiba-home']],
    achievementId: 'tokyo-explorer',
    achievementTitle: 'Tokyo Explorer',
    claimLabel: 'Главные точки Tokyo открыты',
    fact: 'Новые вещи можно брать сразу, а цены на редкий и used-мерч лучше запомнить или сфотографировать и завтра сравнить с Nakano Broadway.',
    riddle: {
      question: 'Какой цвет ведёт по указателям к поездам JR Yamanote?',
      hint: 'Не угадывай по памяти — найди полосу на платформе или схеме.',
      options: ['Красным', 'Салатовым', 'Фиолетовым', 'Чёрным'],
      answer: 1,
      explanation: 'Yamanote отмечена светло-зелёным цветом uguisu.',
      location: 'JR Akihabara · указатели или платформа Yamanote Line',
    },
    timeline: [
      { id: 'tsukiji-breakfast', time: '07:40–09:30', title: 'Начать день настоящим японским завтраком', kind: 'food', food: primaryFood('Завтрак', 'Tsukiji Nippon Fish Port Market Restaurant', 'Рыба, рис, miso soup и японский утренний ритм.', [{ name: 'Tsumugi at Tsukiji Honganji', note: 'Tamagoyaki, рис, miso soup, рыба или гарниры и чай.' }], 'Можно спокойно выбрать другое место рядом в Tsukiji.'), details: ['Выйти из жилья в 07:40, дойти до Daimon и по Suica проехать по Toei Asakusa Line до Higashi-ginza. От станции — около 10 минут пешком.'] },
      { id: 'ginza-walk', time: '09:45', title: 'Перейти из старого Tsukiji в блестящую Ginza', kind: 'route', details: ['До Ginza около 15 минут пешком — без пересадок и с утренними улицами Tokyo по пути.'] },
      { id: 'jins', time: '10:00–10:45', title: 'Выбрать новый взгляд на Tokyo', kind: 'quest', details: ['В JINS Ginza выбрать оправы обоим, пройти проверку зрения и заказать линзы.', 'Если стандартные линзы есть в наличии — получить время готовности в тот же день.'] },
      { id: 'apple-ginza', time: '10:50–11:20', title: 'Заглянуть во флагман Apple Ginza', kind: 'place', details: ['Коротко посмотреть четырёхэтажный магазин и не превращать остановку в отдельную экспедицию.'] },
      { id: 'uniqlo-sushi', time: '11:30–12:20', title: 'Подняться по двенадцати этажам UNIQLO Ginza', kind: 'place', details: ['Посмотреть одежду, коллаборации и японские коллекции в главном магазине UNIQLO.'] },
      { id: 'jins-pickup', time: '12:20–12:30', title: 'Проверить готовность очков', kind: 'quest', details: ['Если очки готовы — забрать. Если нет, оставить получение на потом или на 11 октября.'] },
      { id: 'sushi-midori', time: '12:45–13:45', title: 'Сделать обеденную паузу в Ginza', kind: 'food', food: primaryFood('Обед', 'Ginza Bairin Honten', 'Tonkatsu перед переключением на электрический город.', [{ name: 'Sushi no Midori Ginza', note: 'Суши-альтернатива, которая уже была в плане.' }], 'Можно спокойно выбрать другое место рядом в Ginza.'), details: [] },
      { id: 'ginza-to-akihabara', time: 'После обеда', title: 'Переключиться на электрическую линию', kind: 'route', details: ['Дойти до Ginza Station, войти по Suica и по Hibiya Line доехать до Akihabara. После выхода перейти к станции JR.'] },
      { id: 'stamp-akihabara', time: 'Около 14:15', title: 'Поймать электрическую печать', kind: 'quest', details: ['В районе Central Gate станции JR найти 駅スタンプ / Eki Stamp #4, поставить его в туристический блокнот и отметить находку в Passport приложения.'] },
      { id: 'kanda-myojin-anime', time: '14:30–15:00', title: 'Попросить удачу у хранителя Akihabara', kind: 'quest', details: ['От станции около 7–10 минут пешком до Kanda Myojin — святилища из мира Love Live! и Steins;Gate.', 'Для храмовой коллекции показать отдельную goshuincho служителю и попросить goshuin.', 'Ema — деревянная табличка для желания: можно выбрать иллюстрированную, написать желание и оставить на специальной стойке. Не фотографировать там, где это запрещено.'] },
      { id: 'steins-gate-line', time: 'С 15:10', title: 'Перейти на мировую линию Steins;Gate', kind: 'quest', details: ['Начать с Radio Kaikan у Electric Town Exit: культовая точка Steins;Gate, фигурки, мерч и AmiAmi.', 'Затем пройти через Manseibashi Bridge — ещё одну знакомую точку из аниме.'] },
      { id: 'akihabara', time: 'До 19:30', title: 'Начать большую охоту за сокровищами', kind: 'quest', details: ['Зайти в Mandarake Complex за used-мерчем, Super Potato за ретро-играми, animate Akihabara, GiGO и магазины Electric Town.', 'Новые вещи можно брать здесь; редкий и used-мерч сначала сравнить с завтрашним Nakano Broadway.'] },
      { id: 'akiba-night', time: 'Около 19:30', title: 'Сделать спокойную паузу в Akihabara', kind: 'food', food: primaryFood('Ужин', 'Sushi & Shabu-shabu Yuzu-an Akihabara', 'Суши и shabu-shabu после большого круга по Electric Town.', undefined, 'Можно спокойно выбрать другое место рядом в Akihabara.'), details: [] },
      { id: 'akiba-lights', time: '20:30–21:00', title: 'Запомнить Akihabara в неоне', kind: 'place', details: ['Последний круг по игровым центрам и магазинам, пока Electric Town светится ярче всего.'] },
      { id: 'akiba-home', time: 'После 21:00', title: 'Вернуться домой по зелёной линии', kind: 'route', details: ['От JR Akihabara по Suica сесть на Yamanote или Keihin-Tohoku Line до Hamamatsucho, выйти по Suica и дойти до жилья.', 'Перед сном проверить переключатель Fuji в Passport: если поездка состоялась 9 октября, завтра Asakusa, Ueno, Hama-rikyu, Murakami Library и Nakano; если перенесена — план Fuji.'] },
    ],
  },
  {
    id: 'asakusa-nakano',
    date: '2026-10-11',
    dateLabel: '11 октября',
    city: 'Tokyo',
    eyebrow: 'Глава 12 · Между книгой и неоном',
    title: 'Tokyo между строк',
    subtitle: 'Asakusa, сад на воде, Мураками и Nakano',
    vibe: dayVibe('full', 'Насыщенный', 'Между районами', 'Этот день прыгает по Tokyo, зато финал в Nakano оставлен без сценария и с ужином по настроению.', 'Не успеваем микро-точку — не догоняем её: Murakami и Nakano важнее.', '📚'),
    cover: cover.tokyo,
    mapFile: '2026-10-11-asakusa-ueno-murakami.html',
    mapRouteScenes: [['konbini-asakusa'], ['sensoji'], ['nakamise-bite'], ['sumida'], ['ueno'], ['ameyoko'], ['hamarikyu'], ['hamarikyu'], ['murakami-library'], ['nakano'], ['nakano-dinner']],
    achievementId: 'lost-in-tokyo',
    achievementTitle: 'Lost in Tokyo',
    claimLabel: 'Я прошла Tokyo между строк',
    fact: 'Если план Fuji перенесён на сегодня, эта глава переедет на 9 октября вместе с наградой — переключатель ждёт в Passport.',
    riddle: {
      question: 'Что спрятано на нижней стороне огромного фонаря Kaminarimon?',
      hint: 'Встань под фонарём и посмотри вверх, а не на толпу.',
      options: ['Резной дракон', 'Золотая лиса', 'Карта Edo', 'Маленький колокол'],
      answer: 0,
      explanation: 'Снизу фонаря скрывается резной дракон — маленькая награда для тех, кто смотрит не только вперёд.',
      location: 'Asakusa · ворота Kaminarimon',
    },
    timeline: [
      { id: 'konbini-asakusa', time: '07:05', title: 'Собрать завтрак путешественницы', kind: 'food', food: freeFood('Завтрак', 'Egg sando, onigiri и кофе из 7-Eleven — съесть без спешки по дороге к Daimon.', 'По дороге к Daimon'), details: ['Дальше одна линия ведёт прямо в Asakusa.'] },
      { id: 'sensoji', time: '08:00–09:45', title: 'Разбудить старый Tokyo', kind: 'quest', details: ['Пройди под Kaminarimon, загляни на Nakamise и доберись до Senso-ji, пока храм ещё не растворился в толпе.', 'Если хочется продолжить храмовую коллекцию, показать отдельную goshuincho в окне goshuin — служитель добавит новую запись. Это не Eki stamp и не отметка в Passport приложения.', 'Вход на территорию свободный.'] },
      { id: 'nakamise-bite', time: 'По пути', title: 'Выбрать сладость у старой улицы', kind: 'food', food: freeFood('Перекус', 'Ningyo-yaki или тёплый melon pan — сегодня решение принимает запах.', 'Nakamise'), details: ['После Senso-ji, если закончите примерно к 09:45–10:00 и хочется ещё один вид: напротив Kaminarimon подняться на 8F Asakusa Culture Tourist Information Center. Терраса бесплатная, видно Nakamise, Senso-ji и Skytree; заложить 10–15 минут. Она открывается с 09:00, поэтому не пытаемся впихнуть её до Kaminarimon.'] },
      { id: 'sumida', time: '09:45–10:20', title: 'Поймать Skytree в реке', kind: 'place', details: ['Пройдись по набережной Sumida и найди отражение башни между лодками и мостами. Потом короткий переезд по Ginza Line до Ueno.'] },
      { id: 'ueno', time: '10:40–11:30', title: 'Спрятаться у пруда Shinobazu', kind: 'place', details: ['Ueno Park даст тихую передышку: вода, лотосы и один круг без обязательных достопримечательностей.'] },
      { id: 'ameyoko', time: '11:30–12:30', title: 'Сделать паузу на monjayaki', kind: 'food', food: primaryFood('Обед', 'Monja Moheji Ueno', 'Monjayaki перед дорогой к Hama-rikyu.', undefined, 'Можно спокойно выбрать другое место рядом на Ameyoko.'), details: [] },
      { id: 'hamarikyu', time: '13:15–14:40', title: 'Найти сад, который дышит вместе с заливом', kind: 'place', details: ['От Shimbashi — около 12 минут пешком до Hama-rikyu. Приливный пруд меняется вместе с Tokyo Bay, а вокруг него отражаются небоскрёбы.', 'Вход ¥300. На островке Nakajima-no-ochaya можно остановиться ради matcha и wagashi.'] },
      { id: 'murakami-library', time: '15:25–16:40', title: 'Войти в роман Мураками', kind: 'quest', details: ['В Waseda International House of Literature найди настоящий рояль из джаз-бара Peter Cat — тот самый инструмент, рядом с которым музыка стала частью будущих книг.', 'Дальше собери личный маршрут: кабинет писателя, переводы со всего мира, коллекция пластинок, Sheep Man и сценический Saturn из «Кафки на пляже».', 'Вход свободный, бронь для обычного визита не нужна. Orange Cat считай бонусом: у кафе отдельный график и по воскресеньям оно обычно закрыто.'] },
      { id: 'nakano', time: '17:10–20:00', title: 'Открыть финальный уровень охоты', kind: 'quest', details: ['Tozai Line довезёт от Waseda прямо до Nakano. Пройди через Sun Mall в Nakano Broadway и сравни находки Mandarake с ценами Akihabara.', 'Редкий used merch, фигурки, манга и старые игры — покупать только то, что вызывает настоящее «нашла!».'] },
      { id: 'nakano-dinner', time: 'После 20:00', title: 'Отпраздновать находки без сценария', kind: 'food', food: freeFood('Ужин', 'Здесь специально оставляем свободу: ramen, yakitori или маленькая izakaya — выбрать то, на что остались силы.', 'Nakano Sun Mall'), details: ['Домой: Chuo Line до Shinjuku, затем Oedo Line до Daimon. Завтрашний checkout уже подождёт.'] },
    ],
  },
  {
    id: 'last-day',
    date: '2026-10-12',
    dateLabel: '12 октября',
    city: 'Tokyo',
    eyebrow: 'Глава 13 · Последний фонарь',
    title: 'Ещё один вечер',
    subtitle: 'Tokyo Station, Odaiba и дорога к Haneda',
    vibe: dayVibe('steady', 'Свободный', 'Последний мягкий день', 'Здесь специально много воздуха: один хороший обед, набережная, свободный ужин и дорога домой.', 'Самолёт важнее последнего бонуса — в аэропорт едем спокойно.', '🌙'),
    cover: cover.tokyo,
    mapFile: '2026-10-12-last-day.html',
    mapRouteScenes: [['checkout-locker'], ['checkout-locker'], ['marunouchi'], ['marunouchi'], ['marunouchi'], ['rokurinsha'], ['rokurinsha'], ['odaiba'], ['odaiba'], ['odaiba'], ['odaiba', 'odaiba-dinner'], ['bags-haneda'], ['bags-haneda', 'haneda']],
    achievementId: 'one-more-night',
    achievementTitle: 'One More Night',
    claimLabel: 'Последний вечер сохранён',
    fact: 'Чемоданы остаются в coin locker на Hamamatsucho — так последний день можно пройти налегке.',
    riddle: {
      question: 'Сколько животных японского зодиака спрятано под куполом Tokyo Station?',
      hint: 'Зайди со стороны Marunouchi и медленно обведи глазами весь купол.',
      options: ['Четыре', 'Шесть', 'Восемь', 'Двенадцать'],
      answer: 2,
      explanation: 'В восьми углах купола спрятаны восемь из двенадцати животных зодиака.',
      location: 'Tokyo Station · северный или южный купол Marunouchi',
    },
    timeline: [
      { id: 'checkout-locker', time: 'Утром', title: 'Спрятать чемоданы и украсть ещё один день', kind: 'route', details: ['Coin locker на Hamamatsucho освободит руки до самого вечера.'] },
      { id: 'marunouchi', time: 'До обеда', title: 'Увидеть Tokyo из старой открытки', kind: 'place', details: ['Красный вокзал, Marunouchi и каменный мост Nijubashi.', 'Если хочется ещё один ракурс без переезда: на 6F KITTE зайти в KITTE Garden. Это бесплатная крыша прямо напротив Tokyo Station; 10 минут на вид сверху вполне достаточно.'] },
      { id: 'rokurinsha', time: 'В обед', title: 'Научиться правильно есть tsukemen', kind: 'food', food: primaryFood('Обед', 'Rokurinsha Tokyo Ramen Street', 'Tsukemen: лапша отдельно, густой бульон отдельно — встречаются они только перед укусом.', undefined, 'Можно спокойно выбрать другое место на Tokyo Ramen Street.'), details: [] },
      { id: 'odaiba', time: 'Последний длинный вечер', title: 'Уехать на остров будущего', kind: 'place', details: ['Tokyo Bay, Rainbow Bridge, маленькая Liberty и последние спонтанные покупки.', 'Если в день поездки официальный календарь подтверждает шоу: посмотреть Tokyo Aqua Symphony у Odaiba Seaside Park. Это бесплатный светомузыкальный фонтан примерно на 10 минут; по текущему обычному расписанию удобны 17:15, 18:00 или 18:45, но именно 12 октября обязательно свериться с расписанием — его меняют из-за событий и обслуживания.'] },
      { id: 'odaiba-dinner', time: 'До отъезда', title: 'Оставить ужин свободным', kind: 'food', food: freeFood('Ужин', 'Здесь специально оставляем свободу перед аэропортом — выбрать то, что хочется и удобно по времени.', 'Odaiba'), details: [] },
      { id: 'bags-haneda', time: 'После 19:00', title: 'Забрать чемоданы и ехать за последним билетом', kind: 'route', details: ['Monorail от Hamamatsucho довезёт прямо к Haneda Terminal 3.'] },
      { id: 'haneda', time: 'Около 20:30', title: 'Зажечь последний фонарь', kind: 'quest', details: ['Всё формальное позади — дальше только gate, тишина и воспоминания.'] },
    ],
  },
  {
    id: 'finale',
    date: '2026-10-13',
    dateLabel: '13 октября',
    city: 'Finale',
    eyebrow: 'Финал · Путь продолжается',
    title: 'Japan Complete',
    subtitle: 'Последняя страница — и первая память о путешествии',
    vibe: dayVibe('gentle', 'Тихий', 'После истории', 'Здесь уже нечего успевать: только увезти с собой всё, что стало вашим.', 'Правило финала: ничего не забыть — и никуда не спешить.', '💌'),
    cover: cover.intro,
    mapFile: '2026-10-12-last-day.html',
    mapNote: 'Общая карта 12–13 октября: ночной рейс начинается в точке Haneda Terminal 3.',
    mapRouteScenes: [['flight'], ['flight'], ['flight'], ['flight'], ['flight'], ['flight'], ['flight'], ['flight'], ['flight'], ['flight'], ['flight'], ['flight'], ['flight']],
    mapStartProgress: 13,
    achievementId: 'japan-complete',
    achievementTitle: 'Our Japan',
    claimLabel: 'Сохранить нашу Японию',
    fact: 'Финальная глава ничего не проверяет. Она просто собирает маршрут, фотографии и найденные награды в одну историю.',
    riddle: {
      question: 'Как называется японский подарок, который привозят из путешествия?',
      hint: 'Обычно это красиво упакованная местная вкусность для близких.',
      options: ['Omiyage', 'Omikuji', 'Goshuin', 'Yukata'],
      answer: 0,
      explanation: 'Omiyage — маленький подарок из поездки. И да, воспоминания тоже считаются.',
    },
    timeline: [
      { id: 'flight', time: '00:05', title: 'Унести Японию с собой', kind: 'route', details: ['Самолёт улетает, но маленькая Япония уже спрятана внутри тебя.'] },
      { id: 'final-recap', time: 'Когда захочется', title: 'Открыть коробку воспоминаний', kind: 'quest', details: ['Перелистай бейджи и фотографии, а потом выбери главу, которую хочется прожить ещё раз.'] },
    ],
  },
]

export const sideQuests: SideQuest[] = [
  {
    id: 'manhole-hunter',
    title: 'Охотница за люками',
    description: 'Найти и сфотографировать самый красивый японский люк.',
    icon: 'camera',
  },
  {
    id: 'vending-roulette',
    title: 'Вендинг-рулетка',
    description: 'Выбрать незнакомый напиток только по дизайну банки.',
    icon: 'sparkles',
  },
  {
    id: 'paper-fortune',
    title: 'Бумажная судьба',
    description: 'Вытянуть omikuji и узнать, что приготовила удача.',
    icon: 'fox',
  },
  {
    id: 'plastic-masterpiece',
    title: 'Пластиковый шедевр',
    description: 'Отыскать витрину с едой, которая выглядит вкуснее настоящей.',
    icon: 'food',
  },
  {
    id: 'station-melody',
    title: 'Мелодия пути',
    description: 'Услышать станционную мелодию и выбрать любимую за поездку.',
    icon: 'route',
  },
  {
    id: 'journey-reflection',
    title: 'Отражение пути',
    description: 'Снять вас вдвоём в отражении: витрина, окно поезда, вода или стекло башни.',
    icon: 'camera',
  },
  {
    id: 'taste-for-two',
    title: 'Вкус на двоих',
    description: 'Разделить что-то, выбранное по запаху, витрине или совершенно странному виду.',
    icon: 'food',
  },
  {
    id: 'japan-oddity',
    title: 'Японская странность',
    description: 'Заметить деталь, от которой хочется сказать: «ну это очень Япония».',
    icon: 'sparkles',
  },
]

export const achievements: Achievement[] = [
  { id: 'welcome-to-japan', title: 'Welcome to Japan', description: 'Первый японский неон уже отражается в глазах. Кицу запомнил вечер, когда Japan стала настоящей.', type: 'story', unlockDate: '2026-09-30', image: badge('welcome-to-japan') },
  { id: 'touch-the-pacific', title: 'Touch the Pacific', description: 'Белый песок, ветер и Тихий океан впереди. Кицу спрятал шум волн в эту печать.', type: 'story', unlockDate: '2026-10-01', image: badge('touch-the-pacific') },
  { id: 'another-world', title: 'Another World', description: 'На один день Osaka открыла портал в другой мир. Вы вошли туда вдвоём — так и положено героям.', type: 'story', unlockDate: '2026-10-02', image: badge('another-world') },
  { id: 'chosen-by-nara', title: 'Chosen by Nara', description: 'Один поклон, один senbei — и олень Nara признал вас своими. Кицу видел всё.', type: 'story', unlockDate: '2026-10-03', image: badge('chosen-by-nara') },
  { id: 'the-old-capital', title: 'The Old Capital', description: 'Kyoto встретил вас каменными улочками и тёплыми фонарями. Первая ночь старой столицы теперь ваша.', type: 'story', unlockDate: '2026-10-04', image: badge('the-old-capital') },
  { id: 'a-thousand-gates', title: 'A Thousand Gates', description: 'Красные torii остались позади один за другим. Лисья гора запомнила ваши шаги.', type: 'story', unlockDate: '2026-10-05', image: badge('a-thousand-gates') },
  { id: 'kyoto-after-dark', title: 'Kyoto After Dark', description: 'После долгой дороги — тёплая купель и огни Kimono Forest. Kyoto умеет награждать тех, кто не спешит.', type: 'story', unlockDate: '2026-10-06', image: badge('kyoto-after-dark') },
  { id: 'hello-tokyo', title: 'Hello, Tokyo', description: 'Tokyo впервые поднялся вокруг вас огнями и башней. Огромный город стал чуть-чуть своим.', type: 'story', unlockDate: '2026-10-07', image: badge('hello-tokyo') },
  { id: 'into-the-storybook', title: 'Into the Storybook', description: 'День прошёл между лесом Meiji, аниме-кадрами и неоном. Похоже, вы случайно вошли внутрь истории.', type: 'story', unlockDate: '2026-10-08', image: badge('into-the-storybook') },
  { id: 'fuji-found', title: 'Fuji Found!', description: 'Fuji всё-таки вышла из облаков. Кицу считает, что это гора первой заметила вас.', type: 'story', unlockDate: '2026-10-09', image: badge('fuji-found') },
  { id: 'tokyo-explorer', title: 'Tokyo Explorer', description: 'Очки, святилище и сокровища Akihabara. Большой город открыл ещё одну секретную дверь.', type: 'story', unlockDate: '2026-10-10', image: badge('tokyo-explorer') },
  { id: 'lost-in-tokyo', title: 'Lost in Tokyo', description: 'Asakusa, сад, книги Мураками и Nakano сложились в ваш собственный Tokyo. Потеряться получилось правильно.', type: 'story', unlockDate: '2026-10-11', image: badge('lost-in-tokyo') },
  { id: 'one-more-night', title: 'One More Night', description: 'Последний вечер у Tokyo Bay не хотел заканчиваться. Кицу сохранил его свет до возвращения домой.', type: 'story', unlockDate: '2026-10-12', image: badge('one-more-night') },
  { id: 'japan-complete', title: 'Our Japan', description: 'Маршрут закончился, но эта Япония теперь навсегда немного ваша. Самое важное уезжает вместе с вами.', type: 'story', unlockDate: '2026-10-13', image: badge('japan-complete') },
  { id: 'beyond-the-journey', title: 'Beyond the Journey', description: 'Restaurant of Memories открылся ровно на одну главу. Кицу знает: короткая остановка тоже может остаться с нами на десятилетия.', type: 'secret', image: badge('beyond-the-journey') },
  { id: 'kitsu-i-choose-you', title: 'Kitsu, I Choose You!', description: 'Pokémon Café выбрал своего главного спутника. Конечно, им оказался Кицу — другого ответа и быть не могло.', type: 'secret', image: badge('kitsu-i-choose-you') },
  { id: 'weather-child', title: 'Weather Child', description: 'Небо, газон и Tokyo Tower совпали с кадром. На секунду погода сыграла роль специально для вас.', type: 'secret', image: badge('weather-child') },
  { id: 'shibuya-incident', title: 'Shibuya Incident', description: 'Shibuya пройден по следам Jujutsu Kaisen. Мировая линия спокойна — инцидент остался только в аниме.', type: 'secret', image: badge('shibuya-incident') },
  { id: 'i-remember-you', title: 'I Remember You', description: 'Красные перила и та самая лестница наконец перед вами. Где-то рядом время опять перепутало имена.', type: 'secret', image: badge('i-remember-you') },
  { id: 'el-psy-kongroo', title: 'El Psy Kongroo', description: 'Kanda Myojin, Radio Kaikan и Manseibashi сошлись в одной мировой линии. El Psy Kongroo.', type: 'secret', image: badge('el-psy-kongroo') },
  { id: 'kindled-in-japan', title: 'Kindled in Japan', description: 'Среди Tokyo нашлась искра Dark Souls или Elden Ring. Костёр зажжён — закрытая сцена теперь не приговор.', type: 'secret', image: badge('kindled-in-japan') },
  { id: 'library-between-worlds', title: 'The Library Between Worlds', description: 'Рояль Peter Cat, пластинки и книги открыли дверь между мирами. Кицу ушёл искать кота и вернулся уже не совсем тем же.', type: 'secret', image: badge('library-between-worlds') },
  { id: 'ramen-initiation', title: 'Ramen Initiation', description: 'Первая миска ramen исчезла без следа. Кицу объявляет вкусовое путешествие официально начатым.', type: 'secret', image: badge('ramen-initiation') },
  { id: 'konbini-connoisseur', title: 'Konbini Connoisseur', description: '7-Eleven, FamilyMart и Lawson пройдены. Маленькая повседневная Japan собрана по трём пакетам.', type: 'secret', image: badge('konbini-connoisseur') },
  { id: 'stamp-hunter', title: 'Stamp Hunter', description: 'Пять станционных печатей легли в Travel Passport. Теперь у дороги есть собственные подписи.', type: 'secret', image: badge('stamp-hunter') },
  { id: 'perfect-day', title: 'Perfect Day', description: 'Один день получил честные 10/10. Кицу поставил рядом маленькую звезду и ничего не стал исправлять.', type: 'secret', image: badge('perfect-day') },
  { id: 'memory-keeper', title: 'Memory Keeper', description: 'Пять фотографий уже умеют вернуть запах, свет и настроение дня. Плёнка памяти начала проявляться.', type: 'secret', image: badge('memory-keeper') },
  { id: 'curious-fox', title: 'Curious Fox', description: 'Пять подсказок Кицу помогли заметить главное. Настоящая победа не становится меньше от дружеского шёпота.', type: 'secret', image: badge('curious-fox') },
  { id: 'field-researcher', title: 'First Clue', description: 'Первая улика найдена не на экране, а прямо в Japan. Кицу довольно щурится: охота началась.', type: 'secret', image: badge('field-researcher') },
  { id: 'foxfire-constellation', title: 'Foxfire Constellation', description: 'Пятнадцать маленьких огней нашли друг друга. Над дневником зажглось созвездие всей вашей дороги.', type: 'meta', image: badge('foxfire-constellation') },
  { id: 'manhole-hunter', title: 'Manhole Hunter', description: 'Самый красивый японский люк не ускользнул под ноги. Даже дорога здесь умеет быть искусством.', type: 'secret', image: badge('manhole-hunter') },
  { id: 'capsule-of-fate', title: 'Capsule of Fate', description: 'Монетка упала, ручка повернулась — и случай выбрал именно эту капсулу. Возражения судьбой не принимаются.', type: 'secret', image: badge('capsule-of-fate') },
  { id: 'fortune-found', title: 'Fortune Found', description: 'Omikuji вытянуто, будущее прочитано. Хорошую удачу берём с собой, остальному оставляем шанс передумать.', type: 'secret', image: badge('fortune-found') },
  { id: 'kitsus-equal', title: "Kitsu's Partner", description: 'Все полевые загадки разгаданы. Кицу больше не ведёт за собой — теперь вы идёте рядом.', type: 'meta', image: badge('kitsus-equal') },
  { id: 'wandering-legend', title: 'Wandering Legend', description: 'Пять случайных находок вошли в историю без приглашения. Именно такие главы потом вспоминаются громче плана.', type: 'meta', image: badge('wandering-legend') },
  { id: 'side-by-side', title: 'Side by Side', description: 'Сто тысяч шагов пройдены рядом — по станциям, храмам, улицам и просто куда глаза глядят.', type: 'meta', image: badge('side-by-side') },
  { id: 'japan-collector', title: 'Japan Collector', description: 'Двадцать живых воспоминаний собрались в одну коллекцию. Кицу уверен: вы уже увозите больше, чем поместится в чемодан.', type: 'meta', image: badge('japan-collector') },
]

export const passportStamps = [
  { id: 'kix', title: 'Kansai Airport', subtitle: 'Kansai Airport Station' },
  { id: 'shirahama', title: 'Shirahama', subtitle: 'Shirahama Station' },
  { id: 'gion', title: 'Gion-Shijo', subtitle: 'Gion-Shijo Station' },
  { id: 'akihabara', title: 'Akihabara', subtitle: 'JR · Central Gate' },
  { id: 'wildcard', title: 'Секретный штамп', subtitle: 'Любой обычный туристический штамп' },
]
