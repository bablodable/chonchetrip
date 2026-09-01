export type AnimeFrameGuide = {
  work: string
  moment: string
  image: string
  alt: string
  shot: string
}

export const animeFrameGuides: Record<string, AnimeFrameGuide[]> = {
  shiba: [
    {
      work: 'Weathering With You · 天気の子',
      moment: 'Тот самый газон Shiba Park',
      image: '/assets/anime-frames/weathering-shiba.webp',
      alt: 'Кадр из Weathering With You: газон Shiba Park, Tokyo Tower, Zojo-ji и герои на скамейке',
      shot: 'Найди большую открытую лужайку и останься у её края возле скамеек. В нужном направлении Tokyo Tower будет слева, крыша Zojo-ji ближе к центру, а почти весь низ кадра займёт газон.',
    },
  ],
  'jujutsu-route': [
    {
      work: 'Jujutsu Kaisen · 呪術廻戦',
      moment: 'Shibuya перед инцидентом',
      image: '/assets/anime-frames/jujutsu-shibuya.webp',
      alt: 'Кадр из Jujutsu Kaisen: герой смотрит на круглую башню Shibuya 109',
      shot: 'У Hachiko Crossing найди круглую башню 109. В аниме вывеску заменили на «100». Поймай низкий ракурс только во время обычного перехода и не останавливайся посреди дороги.',
    },
  ],
  'suga-steps': [
    {
      work: 'Your Name · 君の名は。',
      moment: 'Мицуха наверху той самой лестницы',
      image: '/assets/anime-frames/your-name-suga.webp',
      alt: 'Кадр из Your Name: длинная лестница Suga Shrine с красными перилами и Мицухой наверху',
      shot: 'Для этого ракурса останься внизу и направь камеру вверх. В кадр должны целиком войти длинные ступени, три линии красных перил и верхняя площадка; проход надолго не занимай.',
    },
  ],
  'kanda-myojin-anime': [
    {
      work: 'Love Live! · ラブライブ！',
      moment: 'Тренировочная лестница μ’s',
      image: '/assets/anime-frames/love-live-kanda.webp',
      alt: 'Кадр из Love Live: героини поднимаются по лестнице Otokozaka у Kanda Myojin',
      shot: 'Это Otokozaka, крутая боковая лестница к Kanda Myojin. Самый узнаваемый ракурс открывается сверху вниз: внизу должна уходить узкая улица, а слева находиться стена святилища.',
    },
  ],
  'steins-gate-line': [
    {
      work: 'Steins;Gate · シュタインズ・ゲート',
      moment: 'Radio Kaikan и странный гость',
      image: '/assets/anime-frames/steins-radio-kaikan.webp',
      alt: 'Кадр из Steins Gate: Radio Kaikan с загадочным объектом у крыши',
      shot: 'От Electric Town Exit найди жёлтую вывеску Radio Kaikan и сними фасад снизу вверх. Здание после выхода аниме перестроили, поэтому окна и реклама отличаются. Важнее сохранить общий угол.',
    },
  ],
}
