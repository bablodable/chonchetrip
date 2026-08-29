export type TimelineItem = {
  id: string
  time: string
  title: string
  kind: 'route' | 'place' | 'food' | 'quest' | 'rest'
  details: string[]
}

export type Riddle = {
  question: string
  hint: string
  options: string[]
  answer: number
  explanation: string
  location?: string
}

export type TripDay = {
  id: string
  date: string
  dateLabel: string
  city: string
  eyebrow: string
  title: string
  subtitle: string
  cover: string
  achievementId: string
  achievementTitle: string
  claimLabel: string
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
  image?: string
  seal?: string
}

export type SideQuest = {
  id: string
  title: string
  description: string
  icon: 'camera' | 'food' | 'fox' | 'place' | 'quest' | 'route' | 'sparkles'
}

const cover = {
  osaka: '/assets/osaka-cover.png',
  kyoto: '/assets/kyoto-cover.png',
  tokyo: '/assets/tokyo-cover.png',
  intro: '/assets/chonchetrip-splash.png',
}

const badge = (name: string) => `/assets/achivments/${name}.png`

export const tripDays: TripDay[] = [
  {
    id: 'arrival-osaka',
    date: '2026-09-30',
    dateLabel: '30 сентября',
    city: 'Osaka',
    eyebrow: 'Глава 01 · Прибытие',
    title: 'Первый фонарь зажжён',
    subtitle: 'KIX, первый штамп и неон Dotonbori',
    cover: cover.osaka,
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
        details: ['Паспорт, QR, чемодан — и за дверями уже начинается Osaka.'],
      },
      {
        id: 'kuroshio-ticket',
        time: 'Перед выходом',
        title: 'Поймать билет в завтрашнее море',
        kind: 'quest',
        details: ['Нужны два места рядом на Kuroshio 1 · завтра в 07:59 из Tennoji.'],
      },
      {
        id: 'stamp-kix',
        time: 'Первая находка',
        title: 'Поставить печать начала пути',
        kind: 'quest',
        details: ['Отыщи свой первый 駅スタンプ на станции аэропорта.'],
      },
      {
        id: 'to-hotel-osaka',
        time: 'Вечер',
        title: 'Прокатиться на первом японском поезде',
        kind: 'route',
        details: ['Rapi:t увезёт к Tengachaya, оттуда — один прыжок до Nagahoribashi.'],
      },
      {
        id: 'osaka-checkin',
        time: 'Перед неоном',
        title: 'Сбросить рюкзаки',
        kind: 'rest',
        details: ['Короткая передышка в Grand Hostel LDK — дальше город не даст уснуть.'],
      },
      {
        id: 'dotonbori',
        time: '~20:30',
        title: 'Пройти неоновое крещение',
        kind: 'place',
        details: ['Найди бегущего Glico, съешь горячий takoyaki и просто потеряйся в огнях Dotonbori.'],
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
    cover: cover.osaka,
    achievementId: 'touch-the-pacific',
    achievementTitle: 'Touch the Pacific',
    claimLabel: 'Я коснулась Тихого океана',
    fact: 'Название Shirarahama буквально отсылает к белому песчаному берегу — именно ради него сегодня путь уходит далеко на юг.',
    riddle: {
      question: 'На сколько метров лифт уносит вниз к пещере Sandanbeki?',
      hint: 'Число можно заметить у входа или внутри лифта.',
      options: ['12 метров', '24 метра', '36 метров', '50 метров'],
      answer: 2,
      explanation: 'Лифт спускается на 36 метров — прямо к морской пещере под скалами.',
      location: 'Sandanbeki · вход в пещеру и лифт',
    },
    timeline: [
      { id: 'early-breakfast', time: '06:50', title: 'Собрать завтрак охотника за океаном', kind: 'food', details: ['Egg sando, onigiri и кофе — всё остальное сделает поезд.'] },
      { id: 'train-shirahama', time: '07:59', title: 'Сбежать из города к морю', kind: 'route', details: ['Kuroshio 1 отправляется из Tennoji и через два часа привозит к белому берегу.'] },
      { id: 'stamp-shirahama', time: 'По прибытии', title: 'Найти печать с запахом моря', kind: 'quest', details: ['Вторая печать прячется на Shirahama Station.'] },
      { id: 'beach', time: 'До обеда', title: 'Коснуться Тихого океана', kind: 'quest', details: ['Разуться, выйти на белый песок и проверить, действительно ли океан холодный.'] },
      { id: 'seafood', time: 'Когда проголодаешься', title: 'Съесть немного моря', kind: 'food', details: ['Выбирай то, что выглядит самым свежим: kaisendon, sashimi или рыбу дня.'] },
      { id: 'coast', time: 'После обеда', title: 'Пройти по краю мира', kind: 'place', details: ['Senjojiki и Sandanbeki — ветер, утёсы и океан без конца.'] },
      { id: 'parco', time: 'Вечером', title: 'Вернуться в мир игр', kind: 'place', details: ['Kojima Productions, TORCH TORCH и заслуженная миска ramen.'] },
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
    cover: cover.osaka,
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
      { id: 'halloween', time: 'После 18:00', title: 'Дождаться, пока парк станет страшным', kind: 'place', details: ['Street Zombies и Zombie de Dance начинаются только после темноты.'] },
      { id: 'jurassic', time: '20:00', title: 'Прокатиться среди динозавров во тьме', kind: 'quest', details: ['Финальный рывок дня — Jurassic Park in the Dark.'] },
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
    cover: cover.osaka,
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
      { id: 'todaiji', time: 'Утром', title: 'Поздороваться с Великим Буддой', kind: 'place', details: ['Пройди через огромные ворота Nandaimon к Daibutsuden.'] },
      { id: 'kasuga', time: 'До обеда', title: 'Сосчитать фонари и сбиться', kind: 'place', details: ['Каменные и бронзовые фонари Kasuga Taisha специально не хотят считаться.'] },
      { id: 'nara-food', time: 'После полудня', title: 'Поймать ещё тёплый mochi', kind: 'food', details: ['Чайный домик, Naramachi и свежий yomogi mochi у Nakatanidou.'] },
      { id: 'pokemon-osaka', time: 'Вечером', title: 'Отдать вечер Pokémon', kind: 'quest', details: ['Бронь в Pokémon Café — главный пропуск; после можно заглянуть в Shinsekai.'] },
    ],
  },
  {
    id: 'kyoto-arrival',
    date: '2026-10-04',
    dateLabel: '4 октября',
    city: 'Kyoto',
    eyebrow: 'Глава 05 · Старая столица',
    title: 'По следам дракона',
    subtitle: 'Kiyomizu-dera, Gion и первый goshuin',
    cover: cover.kyoto,
    achievementId: 'the-old-capital',
    achievementTitle: 'The Old Capital',
    claimLabel: 'Первый знак Kyoto открыт',
    fact: 'Goshuincho — книга, в которую в храмах и святилищах собирают каллиграфические печати goshuin.',
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
      { id: 'stamp-gion', time: 'На станции', title: 'Поставить печать Kyoto', kind: 'quest', details: ['Третья печать ждёт где-то на Gion-Shijo Station.'] },
      { id: 'tazuru-bags', time: 'Перед прогулкой', title: 'Оставить чемоданы и стать налегке', kind: 'rest', details: ['Tazuru приютит вещи до check-in.'] },
      { id: 'kiyomizu', time: 'До обеда', title: 'Открыть книгу храмовых печатей', kind: 'quest', details: ['На террасе Kiyomizu-dera начинается история нового goshuincho.'] },
      { id: 'old-streets', time: 'После храма', title: 'Потеряться в старых улочках', kind: 'place', details: ['Sannenzaka, Ninenzaka, пагода и столько matcha-сладостей, сколько захочется.'] },
      { id: 'gion', time: 'Ближе к вечеру', title: 'Найти драконов Gion', kind: 'place', details: ['Сначала потолок Kennin-ji, потом фонари Hanamikoji и тихий канал.'] },
      { id: 'kaiseki', time: 'Вечером', title: 'Устроить самый красивый ужин поездки', kind: 'food', details: ['Kaiseki, Pontocho и медленная прогулка вдоль Kamo River.'] },
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
    cover: cover.kyoto,
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
      { id: 'nishiki', time: 'В обед', title: 'Собрать обед по кусочкам', kind: 'food', details: ['Один tamagoyaki, что-нибудь морское, что-нибудь жареное и wagashi на счастье.'] },
      { id: 'nijo', time: 'После рынка', title: 'Проверить, поют ли полы замка', kind: 'place', details: ['Прогулка через Ninomaru Palace и сады Nijo.'] },
      { id: 'matcha-night', time: 'Под вечер', title: 'Закончить день зелёным parfait', kind: 'food', details: ['Matcha в Nakamura Tokichi, вечерние улицы и dashi ramen.'] },
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
    cover: cover.kyoto,
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
      { id: 'tofu-lunch', time: 'В обед', title: 'Попробовать Kyoto на вкус', kind: 'food', details: ['Горячий yudofu — простой обед, который неожиданно запоминается.'] },
      { id: 'otagi', time: 'После обеда', title: 'Найти каменное лицо с твоим настроением', kind: 'quest', details: ['В Otagi живут 1200 rakan — один из них точно похож на тебя сегодня.'] },
      { id: 'kimono-forest', time: 'После заката', title: 'Дождаться, когда зажжётся лес кимоно', kind: 'quest', details: ['Световые колонны Kimono Forest — финальная магия Kyoto.'] },
      { id: 'obanzai', time: 'Вечером', title: 'Собрать ужин из маленьких историй', kind: 'food', details: ['Несколько сезонных obanzai — и никаких спешных решений.'] },
    ],
  },
  {
    id: 'hello-tokyo',
    date: '2026-10-07',
    dateLabel: '7 октября',
    city: 'Tokyo',
    eyebrow: 'Глава 08 · Новый горизонт',
    title: 'Hello, Tokyo',
    subtitle: 'Shinkansen, Zojo-ji и огни Tokyo Tower',
    cover: cover.tokyo,
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
      { id: 'matcha-ekiben', time: 'Перед поездом', title: 'Собрать идеальный набор в Shinkansen', kind: 'food', details: ['Matcha-десерт сейчас, красивый ekiben — с собой.'] },
      { id: 'shinkansen', time: 'Около 12:30', title: 'Промчаться через Японию', kind: 'route', details: ['Nozomi доставит из Kyoto в Shinagawa быстрее, чем закончится ощущение дороги.'] },
      { id: 'tokyo-checkin', time: 'После прибытия', title: 'Оставить вещи в новом доме', kind: 'rest', details: ['Небольшая пауза в Shiba перед первым вечером Tokyo.'] },
      { id: 'shiba', time: 'Ближе к закату', title: 'Увидеть башню между храмовыми воротами', kind: 'place', details: ['Пройди через Zojo-ji и Shiba Park, не торопясь к красной башне.'] },
      { id: 'tower', time: 'Когда зажгутся огни', title: 'Поздороваться с Tokyo сверху', kind: 'quest', details: ['Поднимись на Main Deck и дождись, пока город станет бесконечным.'] },
      { id: 'jangara', time: 'После башни', title: 'Закрепить знакомство ramen', kind: 'food', details: ['Tonkotsu ramen и спокойная прогулка домой через Shiba Park.'] },
    ],
  },
  {
    id: 'shibuya-story',
    date: '2026-10-08',
    dateLabel: '8 октября',
    city: 'Tokyo',
    eyebrow: 'Глава 09 · Живая сказка',
    title: 'От леса к неону',
    subtitle: 'Meiji Jingu, Shibuya Sky и ночной Shinjuku',
    cover: cover.tokyo,
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
      { id: 'harajuku', time: 'После тишины', title: 'Выйти из леса прямо в Harajuku', kind: 'place', details: ['Takeshita, Omotesando и Cat Street — смена миров за одну прогулку.'] },
      { id: 'gyukatsu', time: 'В обед', title: 'Дожарить свой обед на камне', kind: 'food', details: ['Хрустящий gyukatsu требует маленького участия — и это половина удовольствия.'] },
      { id: 'shibuya', time: 'После обеда', title: 'Перейти самый знаменитый перекрёсток', kind: 'place', details: ['Поздоровайся с Hachiko, а потом отправляйся собирать мерч в PARCO.'] },
      { id: 'shibuya-sky', time: 'Вход 16:20–16:40', title: 'Поймать Tokyo между днём и ночью', kind: 'quest', details: ['Поднимись на SHIBUYA SKY до заката и останься до первых огней.'] },
      { id: 'shinjuku-night', time: 'После заката', title: 'Пойти туда, где живёт Godzilla', kind: 'place', details: ['Yakitori, Kabukicho и огромная голова над ночным Shinjuku.'] },
      { id: 'ramen-nagi', time: 'Финал', title: 'Найти ramen в переулках Golden Gai', kind: 'food', details: ['Насыщенный niboshi-бульон — заслуженная точка очень длинного дня.'] },
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
    cover: cover.intro,
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
      { id: 'chureito', time: 'Первое испытание', title: 'Подняться к виду с открытки', kind: 'quest', details: ['Ступени к Chureito Pagoda приводят к тому самому кадру с Fuji.'] },
      { id: 'houtou', time: 'После подъёма', title: 'Согреться лапшой из котла', kind: 'food', details: ['Толстая hōtō, овощи и miso-бульон возвращают силы мгновенно.'] },
      { id: 'oishi', time: 'После обеда', title: 'Встретиться с Fuji у воды', kind: 'place', details: ['В Oishi Park между тобой и горой остаётся только озеро.'] },
      { id: 'ropeway', time: 'Перед вечером', title: 'Подняться ещё выше', kind: 'place', details: ['Канатная дорога покажет сразу и Fuji, и Lake Kawaguchi.'] },
      { id: 'fuji-return', time: '17:41', title: 'Увезти гору с собой', kind: 'route', details: ['Сесть у окна Fuji Excursion 48 и пересматривать фотографии до Tokyo.'] },
    ],
  },
  {
    id: 'ginza-akihabara',
    date: '2026-10-10',
    dateLabel: '10 октября',
    city: 'Tokyo',
    eyebrow: 'Глава 11 · Электрический город',
    title: 'Tokyo Explorer',
    subtitle: 'Tsukiji, Ginza и охота за сокровищами Akihabara',
    cover: cover.tokyo,
    achievementId: 'tokyo-explorer',
    achievementTitle: 'Tokyo Explorer',
    claimLabel: 'Главные точки Tokyo открыты',
    fact: 'Сегодня редкие used-вещи лучше только запомнить и сравнить завтра с Nakano Broadway.',
    riddle: {
      question: 'Какой цвет ведёт по указателям к поездам JR Yamanote?',
      hint: 'Не угадывай по памяти — найди полосу на платформе или схеме.',
      options: ['Красным', 'Салатовым', 'Фиолетовым', 'Чёрным'],
      answer: 1,
      explanation: 'Yamanote отмечена светло-зелёным цветом uguisu.',
      location: 'JR Akihabara · указатели или платформа Yamanote Line',
    },
    timeline: [
      { id: 'tsukiji-breakfast', time: 'Утром', title: 'Собрать японский завтрак из 18 маленьких вкусов', kind: 'food', details: ['Tsumugi у Tsukiji Honganji — тихое начало очень яркого дня.'] },
      { id: 'jins', time: 'К 10:00', title: 'Выбрать новый взгляд на Tokyo', kind: 'quest', details: ['Оправы, проверка зрения и маленькое ожидание, пока очки станут настоящими.'] },
      { id: 'uniqlo-sushi', time: 'До обеда', title: 'Подняться по двенадцати этажам Ginza', kind: 'place', details: ['А после — наградить себя хорошими sushi.'] },
      { id: 'stamp-akihabara', time: 'По прибытии', title: 'Поймать электрическую печать', kind: 'quest', details: ['Четвёртый stamp прячется около Central Gate станции Akihabara.'] },
      { id: 'akihabara', time: 'До вечера', title: 'Начать большую охоту за сокровищами', kind: 'quest', details: ['Фигурки, старые игры и редкий merch — сегодня сравнивай, завтра решай.'] },
      { id: 'akiba-night', time: 'Когда устанут ноги', title: 'Выбрать ужин по цвету вывески', kind: 'food', details: ['Ramen, curry или izakaya — правильным будет то, что окажется ближе.'] },
    ],
  },
  {
    id: 'asakusa-nakano',
    date: '2026-10-11',
    dateLabel: '11 октября',
    city: 'Tokyo',
    eyebrow: 'Глава 12 · Потеряться и найтись',
    title: 'Большая прогулка Tokyo',
    subtitle: 'Asakusa, Ueno, Hama-rikyu и Nakano',
    cover: cover.tokyo,
    achievementId: 'lost-in-tokyo',
    achievementTitle: 'Lost in Tokyo',
    claimLabel: 'Вечерний reveal Tokyo открыт',
    fact: 'Если Fuji был скрыт облаками 9 октября, этот день меняется с Fuji местами одной кнопкой в разделе Passport.',
    riddle: {
      question: 'Что спрятано на нижней стороне огромного фонаря Kaminarimon?',
      hint: 'Встань под фонарём и посмотри вверх, а не на толпу.',
      options: ['Резной дракон', 'Золотая лиса', 'Карта Edo', 'Маленький колокол'],
      answer: 0,
      explanation: 'Снизу фонаря скрывается резной дракон — маленькая награда для тех, кто смотрит не только вперёд.',
      location: 'Asakusa · ворота Kaminarimon',
    },
    timeline: [
      { id: 'sensoji', time: 'Пока тихо', title: 'Пройти под огромным фонарём', kind: 'quest', details: ['Kaminarimon откроет дорогу через Nakamise к старому Senso-ji.'] },
      { id: 'sumida-ueno', time: 'После храма', title: 'Идти за Skytree вдоль реки', kind: 'place', details: ['А потом сменить городские виды на пруд Shinobazu в Ueno.'] },
      { id: 'ameyoko', time: 'В обед', title: 'Позволить рынку выбрать еду', kind: 'food', details: ['На Ameyoko побеждает то, что вкуснее пахнет прямо сейчас.'] },
      { id: 'hamarikyu', time: 'После суеты', title: 'Найти сад между небоскрёбами', kind: 'place', details: ['Прогулка вокруг приливного пруда и matcha в чайном домике на воде.'] },
      { id: 'nakano', time: 'Под вечер', title: 'Вернуться за настоящими сокровищами', kind: 'quest', details: ['Nakano Broadway — финальное сравнение цен и охота за редким merch.'] },
      { id: 'nakano-dinner', time: 'После победы', title: 'Отпраздновать находки без плана', kind: 'food', details: ['Выбирай ramen, yakitori или маленькую izakaya по настроению.'] },
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
    cover: cover.tokyo,
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
      { id: 'marunouchi', time: 'До обеда', title: 'Увидеть Tokyo из старой открытки', kind: 'place', details: ['Красный вокзал, Marunouchi и каменный мост Nijubashi.'] },
      { id: 'rokurinsha', time: 'В обед', title: 'Научиться правильно есть tsukemen', kind: 'food', details: ['Лапша отдельно, густой бульон отдельно — встречаются они только перед укусом.'] },
      { id: 'odaiba', time: 'Последний длинный вечер', title: 'Уехать на остров будущего', kind: 'place', details: ['Tokyo Bay, Rainbow Bridge, маленькая Liberty и последние спонтанные покупки.'] },
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
    cover: cover.intro,
    achievementId: 'japan-complete',
    achievementTitle: 'Japan Complete',
    claimLabel: 'Завершить историю',
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
    id: 'gachapon-oracle',
    title: 'Оракул gachapon',
    description: 'Один раз доверить выбор капсулы чистой случайности.',
    icon: 'quest',
  },
  {
    id: 'paper-fortune',
    title: 'Бумажная судьба',
    description: 'Вытянуть omikuji и узнать, что приготовила удача.',
    icon: 'fox',
  },
  {
    id: 'mascot-encounter',
    title: 'Встреча с талисманом',
    description: 'Найти местного mascot: живого, на вывеске или упаковке.',
    icon: 'camera',
  },
  {
    id: 'plastic-masterpiece',
    title: 'Пластиковый шедевр',
    description: 'Отыскать витрину с едой, которая выглядит вкуснее настоящей.',
    icon: 'food',
  },
  {
    id: 'tiny-shrine',
    title: 'Тайное святилище',
    description: 'Заметить крошечный храм или torii среди большого города.',
    icon: 'place',
  },
  {
    id: 'station-melody',
    title: 'Мелодия пути',
    description: 'Услышать станционную мелодию и выбрать любимую за поездку.',
    icon: 'route',
  },
]

export const achievements: Achievement[] = [
  { id: 'welcome-to-japan', title: 'Welcome to Japan', description: 'Первый шаг после прилёта в Osaka.', type: 'story', unlockDate: '2026-09-30', image: badge('welcome-to-japan') },
  { id: 'touch-the-pacific', title: 'Touch the Pacific', description: 'Белый берег Shirahama и Тихий океан.', type: 'story', unlockDate: '2026-10-01', image: badge('touch-the-pacific') },
  { id: 'another-world', title: 'Another World', description: 'Главная миссия в другом мире USJ.', type: 'story', unlockDate: '2026-10-02', image: badge('another-world') },
  { id: 'chosen-by-nara', title: 'Chosen by Nara', description: 'Встреча с оленями Nara.', type: 'story', unlockDate: '2026-10-03', image: badge('chosen-by-nara') },
  { id: 'the-old-capital', title: 'The Old Capital', description: 'Первый знак старой столицы.', type: 'story', unlockDate: '2026-10-04', image: badge('the-old-capital') },
  { id: 'a-thousand-gates', title: 'A Thousand Gates', description: 'Путь через Senbon Torii.', type: 'story', unlockDate: '2026-10-05', image: badge('a-thousand-gates') },
  { id: 'kyoto-after-dark', title: 'Kyoto After Dark', description: 'Свет Kimono Forest после заката.', type: 'story', unlockDate: '2026-10-06', image: badge('kyoto-after-dark') },
  { id: 'hello-tokyo', title: 'Hello, Tokyo', description: 'Первый вечер под Tokyo Tower.', type: 'story', unlockDate: '2026-10-07', image: badge('hello-tokyo') },
  { id: 'into-the-storybook', title: 'Into the Storybook', description: 'От леса Meiji до огней Shinjuku.', type: 'story', unlockDate: '2026-10-08', image: badge('into-the-storybook') },
  { id: 'fuji-found', title: 'Fuji Found!', description: 'Fuji показалась из-за облаков.', type: 'story', unlockDate: '2026-10-09', image: badge('fuji-found') },
  { id: 'tokyo-explorer', title: 'Tokyo Explorer', description: 'Главные точки большого города открыты.', type: 'story', unlockDate: '2026-10-10', image: badge('tokyo-explorer') },
  { id: 'lost-in-tokyo', title: 'Lost in Tokyo', description: 'Большая прогулка от Asakusa до Nakano.', type: 'story', unlockDate: '2026-10-11', image: badge('lost-in-tokyo') },
  { id: 'one-more-night', title: 'One More Night', description: 'Последний вечер путешествия сохранён.', type: 'story', unlockDate: '2026-10-12', image: badge('one-more-night') },
  { id: 'japan-complete', title: 'Japan Complete', description: 'Финальный recap завершён.', type: 'story', unlockDate: '2026-10-13', image: badge('japan-complete') },
  { id: 'ramen-initiation', title: 'Ramen Initiation', description: 'Первый ramen поездки.', type: 'secret', image: badge('ramen-initiation') },
  { id: 'konbini-connoisseur', title: 'Konbini Connoisseur', description: 'Находки из трёх разных konbini.', type: 'secret', image: badge('konbini-connoisseur') },
  { id: 'stamp-hunter', title: 'Stamp Hunter', description: 'Пять японских туристических штампов.', type: 'secret', image: badge('stamp-hunter') },
  { id: 'night-owl', title: 'Night Owl', description: 'Вечерние главы Osaka, Kyoto и Tokyo.', type: 'meta', image: badge('night-owl') },
  { id: 'three-cities', title: 'Three Cities, One Journey', description: 'Osaka, Kyoto и Tokyo открыты.', type: 'meta', image: badge('three-cities-one-journey') },
  { id: 'perfect-day', title: 'Perfect Day', description: 'Один из дней получил 10/10.', type: 'secret', image: badge('perfect-day') },
  { id: 'memory-keeper', title: 'Memory Keeper', description: 'Сохранено пять Photo of the Day.', type: 'secret', image: badge('memory-keeper') },
  { id: 'no-spoilers', title: 'No Spoilers', description: 'Дойти до Tokyo без Reveal answer.', type: 'secret', image: badge('no-spoilers') },
  { id: 'curious-fox', title: 'Curious Fox', description: 'Пять подсказок и ни одного Reveal answer.', type: 'secret', image: badge('curious-fox') },
  { id: 'field-researcher', title: 'Field Researcher', description: 'Первая полевая загадка решена без подсматривания.', type: 'secret', seal: '察' },
  { id: 'keen-eye', title: 'Keen Eye', description: 'Пять настоящих улик замечены по дороге.', type: 'secret', seal: '眼' },
  { id: 'kitsus-equal', title: "Kitsu's Equal", description: 'Все полевые загадки разгаданы без Reveal answer.', type: 'meta', seal: '狐' },
  { id: 'side-quest-accepted', title: 'Side Quest Accepted', description: 'Первая случайная миссия выбрана и выполнена.', type: 'secret', seal: '遊' },
  { id: 'manhole-hunter', title: 'Manhole Hunter', description: 'Найден самый красивый японский люк.', type: 'secret', seal: '蓋' },
  { id: 'capsule-of-fate', title: 'Capsule of Fate', description: 'Судьба доверена одному gachapon.', type: 'secret', seal: '運' },
  { id: 'fortune-found', title: 'Fortune Found', description: 'Бумажное предсказание omikuji найдено.', type: 'secret', seal: '占' },
  { id: 'wandering-legend', title: 'Wandering Legend', description: 'Выполнены все миссии без маршрута.', type: 'meta', seal: '旅' },
  { id: 'japan-collector', title: 'Japan Collector', description: 'Собрано 15 любых достижений.', type: 'meta', image: badge('japan-collector') },
  { id: 'completionist', title: 'Completionist', description: 'Собраны все доступные достижения.', type: 'meta', image: badge('completionist') },
]

export const passportStamps = [
  { id: 'kix', title: 'Kansai Airport', subtitle: 'Kansai Airport Station' },
  { id: 'shirahama', title: 'Shirahama', subtitle: 'Shirahama Station' },
  { id: 'gion', title: 'Gion-Shijo', subtitle: 'Gion-Shijo Station' },
  { id: 'akihabara', title: 'Akihabara', subtitle: 'JR · Central Gate' },
  { id: 'wildcard', title: 'Секретный штамп', subtitle: 'Любая находка по пути' },
]
