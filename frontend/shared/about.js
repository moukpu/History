import { getCurrentLanguage, markLanguageReady, mountLanguageMenu } from "./language.js";

const translations = {
  ru: {
    page_title: "Sapar Quest - О проекте",
    nav_home: "Главная",
    nav_map: "Карта",
    nav_leaderboard: "Рейтинг",
    hero_badge: "Интерактивная история Казахстана",
    hero_title:
      'Sapar Quest — карта, тесты и квест <br><span class="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">по эпохам страны</span>',
    hero_subtitle:
      "Это учебная игра, где история открывается по шагам: проходишь города, отвечаешь на вопросы, собираешь прогресс и открываешь следующий период.",
    feature_periods_title: "7 периодов",
    feature_periods_text:
      "Путь начинается с Казахского ханства и идет дальше по ключевым этапам истории. Новые периоды открываются после прохождения заданий.",
    feature_cities_title: "Города на карте",
    feature_cities_text:
      "Каждый город связан с периодом и своими вопросами. Выбирай точки на карте, проходи тесты и двигайся дальше по маршруту.",
    feature_progress_title: "Квестовый прогресс",
    feature_progress_text:
      "Система запоминает результаты, очки, достижения и открытые эпохи, чтобы путешествие продолжалось с последнего разблокированного этапа.",
    feature_practice_title: "Тренировка знаний",
    feature_practice_text:
      "Вопросы помогают закреплять даты, события, личности и города без ощущения обычной зубрежки.",
    minigames_title: "Мини-игры между периодами",
    minigames_text:
      "При переходе от одного исторического периода к следующему игроков ждёт короткая мини-игра по теме эпохи: караван по Шёлковому пути, защита казахской крепости, сборка пазла мавзолея Ходжи Ахмета Ясауи, мемори-карточки с великими казахстанцами, ловля купюр тенге первого выпуска и расстановка событий Современного Казахстана в хронологическом порядке. Все игры рассчитаны на 1-2 минуты, работают на телефоне и компьютере, и помогают почувствовать переход эпох.",
    how_title: "Как работает <br>Sapar Quest?",
    step_start_title: "Начинай с первого периода",
    step_start_text:
      "Игра ведет по истории последовательно: сначала доступен стартовый период, затем открываются следующие этапы.",
    step_unlock_title: "Открывай эпохи через тесты",
    step_unlock_text:
      "Когда задания городов текущего периода пройдены, следующая эпоха становится доступной на карте.",
    btn_start: "Начать путешествие",
  },
  en: {
    page_title: "Sapar Quest - About the project",
    nav_home: "Home",
    nav_map: "Map",
    nav_leaderboard: "Leaderboard",
    hero_badge: "Interactive history of Kazakhstan",
    hero_title:
      'Sapar Quest is a map, quiz, and quest <br><span class="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">through the country&apos;s eras</span>',
    hero_subtitle:
      "This is a learning game where history opens step by step: complete cities, answer questions, build progress, and unlock the next period.",
    feature_periods_title: "7 periods",
    feature_periods_text:
      "The route starts with the Kazakh Khanate and continues through key stages of history. New periods unlock after you complete the tasks.",
    feature_cities_title: "Cities on the map",
    feature_cities_text:
      "Each city is connected to a period and its own questions. Choose points on the map, complete tests, and move forward along the route.",
    feature_progress_title: "Quest progress",
    feature_progress_text:
      "The system saves results, scores, achievements, and unlocked eras so the journey continues from the latest unlocked stage.",
    feature_practice_title: "Knowledge practice",
    feature_practice_text:
      "Questions help reinforce dates, events, figures, and cities without making history feel like plain memorization.",
    minigames_title: "Mini-games Between Periods",
    minigames_text:
      "When transitioning from one historical period to the next, players are met with a short themed mini-game: a caravan on the Silk Road, defending a Kazakh fortress, assembling a puzzle of the Khoja Ahmed Yasawi mausoleum, a memory game of great Kazakhs, catching first-issue tenge banknotes, and sorting the events of New Kazakhstan in chronological order. Each game lasts 1-2 minutes, works on both phone and PC, and helps players feel the change of eras.",
    how_title: "How does <br>Sapar Quest work?",
    step_start_title: "Start from the first period",
    step_start_text:
      "The game guides you through history in order: the starting period is available first, then the next stages unlock.",
    step_unlock_title: "Unlock eras through tests",
    step_unlock_text:
      "When the city tasks for the current period are completed, the next era becomes available on the map.",
    btn_start: "Start the journey",
  },
  kk: {
    page_title: "Sapar Quest - Жоба туралы",
    nav_home: "Басты бет",
    nav_map: "Карта",
    nav_leaderboard: "Рейтинг",
    hero_badge: "Қазақстан тарихының интерактивті жолы",
    hero_title:
      'Sapar Quest — карта, тест және квест <br><span class="bg-gradient-to-r from-primary to-tertiary bg-clip-text text-transparent">ел дәуірлері бойынша</span>',
    hero_subtitle:
      "Бұл тарихты кезең-кезеңімен ашатын оқу ойыны: қалаларды өтесің, сұрақтарға жауап бересің, прогресс жинайсың және келесі кезеңді ашасың.",
    feature_periods_title: "7 кезең",
    feature_periods_text:
      "Жол Қазақ хандығынан басталып, тарихтың негізгі кезеңдерімен жалғасады. Жаңа кезеңдер тапсырмаларды орындағаннан кейін ашылады.",
    feature_cities_title: "Картадағы қалалар",
    feature_cities_text:
      "Әр қала белгілі бір кезеңмен және өз сұрақтарымен байланысты. Картадағы нүктелерді таңдап, тесттерден өтіп, маршрут бойынша алға жылжы.",
    feature_progress_title: "Квест прогресі",
    feature_progress_text:
      "Жүйе нәтижелерді, ұпайларды, жетістіктерді және ашылған дәуірлерді сақтайды, сондықтан саяхат соңғы ашылған кезеңнен жалғасады.",
    feature_practice_title: "Білімді жаттықтыру",
    feature_practice_text:
      "Сұрақтар даталарды, оқиғаларды, тұлғаларды және қалаларды қарапайым жаттаусыз есте сақтауға көмектеседі.",
    minigames_title: "Кезеңдер арасындағы шағын ойындар",
    minigames_text:
      "Тарихи кезеңдердің бірінен екіншісіне өту кезінде ойыншыларды дәуірге қатысты қысқа шағын ойындар күтеді: Жібек жолындағы керуен, қазақ қамалын қорғау, Қожа Ахмет Ясауи кесенесінің пазлы, ұлы қазақстандықтармен мемори, тұңғыш теңге банкноттарын ұстау және Жаңа Қазақстан оқиғаларын хронологиялық тәртіппен орналастыру. Барлық ойындар 1-2 минутқа есептелген, телефон мен компьютерде жұмыс істейді және дәуірлердің ауысуын сезінуге көмектеседі.",
    how_title: "Sapar Quest <br>қалай жұмыс істейді?",
    step_start_title: "Бірінші кезеңнен баста",
    step_start_text:
      "Ойын тарихты ретімен көрсетеді: алдымен бастапқы кезең қолжетімді, кейін келесі кезеңдер ашылады.",
    step_unlock_title: "Дәуірлерді тест арқылы аш",
    step_unlock_text:
      "Ағымдағы кезеңдегі қала тапсырмалары орындалған кезде, келесі дәуір картада қолжетімді болады.",
    btn_start: "Саяхатты бастау",
  },
};

let currentLanguage = getCurrentLanguage();

function translate(key) {
  return translations[currentLanguage]?.[key] ?? translations.ru[key] ?? key;
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.title = translate("page_title");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    if (element.closest("footer")) return;
    element.textContent = translate(element.dataset.i18n);
  });

  document.querySelectorAll("[data-i18n-html]").forEach((element) => {
    if (element.closest("footer")) return;
    element.innerHTML = translate(element.dataset.i18nHtml);
  });

  markLanguageReady();
}

mountLanguageMenu({
  onChange: (language) => {
    currentLanguage = language;
    applyTranslations();
  },
});

applyTranslations();
