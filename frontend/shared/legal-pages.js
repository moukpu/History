import { getCurrentLanguage, markLanguageReady, mountLanguageMenu } from "./language.js";

const pageData = {
  privacy: {
    ru: {
      page_title: "Sapar Quest - Политика конфиденциальности",
      nav_home: "Главная",
      nav_map: "Карта",
      nav_leaderboard: "Рейтинг",
      badge: "Документы проекта",
      title: "Политика конфиденциальности",
      subtitle:
        "Эта страница объясняет, какие данные использует Sapar Quest и зачем они нужны для работы учебной платформы.",
      updated: "Обновлено: 22 апреля 2026",
      sections: [
        {
          title: "Какие данные сохраняются",
          body: [
            "Sapar Quest может сохранять имя пользователя, адрес электронной почты, идентификатор аккаунта, аватар, результаты тестов, достижения, открытые периоды и историю попыток ЕНТ.",
            "Если используется вход через Google, сайт получает подтвержденную почту, имя и изображение профиля, переданные Google.",
          ],
        },
        {
          title: "Зачем нужны данные",
          body: [
            "Данные нужны для входа в аккаунт, сохранения прогресса, показа достижений, восстановления профиля и работы рейтинга.",
            "Результаты тестов используются только для учебной статистики внутри проекта.",
          ],
        },
        {
          title: "Как данные защищаются",
          body: [
            "Пароли не хранятся в открытом виде. Для них используется хеширование с солью.",
            "Доступ к базе данных должен быть ограничен администратором проекта и настройками хостинга.",
          ],
        },
        {
          title: "Передача данных",
          body: [
            "Sapar Quest не продает персональные данные пользователей.",
            "Отдельные технические сервисы, такие как хостинг, база данных, Google-вход или AI-анализ ЕНТ, могут обрабатывать данные только для работы функций сайта.",
          ],
        },
        {
          title: "Удаление и исправление данных",
          body: [
            "Пользователь может запросить исправление или удаление данных через администратора проекта.",
            "После удаления аккаунта прогресс, попытки тестов и достижения могут быть удалены из рабочей базы данных.",
          ],
        },
      ],
    },
    en: {
      page_title: "Sapar Quest - Privacy Policy",
      nav_home: "Home",
      nav_map: "Map",
      nav_leaderboard: "Leaderboard",
      badge: "Project documents",
      title: "Privacy Policy",
      subtitle:
        "This page explains what data Sapar Quest uses and why it is needed for the learning platform to work.",
      updated: "Updated: April 22, 2026",
      sections: [
        {
          title: "What data is stored",
          body: [
            "Sapar Quest may store a username, email address, account identifier, avatar, quiz results, achievements, unlocked periods, and UNT attempt history.",
            "If Google sign-in is used, the site receives the verified email, name, and profile picture provided by Google.",
          ],
        },
        {
          title: "Why the data is needed",
          body: [
            "The data is used for account access, progress saving, achievement display, profile recovery, and leaderboard functionality.",
            "Test results are used only for educational statistics inside the project.",
          ],
        },
        {
          title: "How data is protected",
          body: [
            "Passwords are not stored as plain text. They are stored using salted hashing.",
            "Database access should be limited by the project administrator and hosting settings.",
          ],
        },
        {
          title: "Data sharing",
          body: [
            "Sapar Quest does not sell users' personal data.",
            "Technical services such as hosting, database storage, Google sign-in, or UNT AI analysis may process data only to provide site features.",
          ],
        },
        {
          title: "Correction and deletion",
          body: [
            "A user may request data correction or deletion through the project administrator.",
            "After account deletion, progress, test attempts, and achievements may be removed from the active database.",
          ],
        },
      ],
    },
    kk: {
      page_title: "Sapar Quest - Құпиялылық саясаты",
      nav_home: "Басты бет",
      nav_map: "Карта",
      nav_leaderboard: "Рейтинг",
      badge: "Жоба құжаттары",
      title: "Құпиялылық саясаты",
      subtitle:
        "Бұл бет Sapar Quest қандай деректерді қолданатынын және олардың оқу платформасы үшін неге қажет екенін түсіндіреді.",
      updated: "Жаңартылды: 22 сәуір 2026",
      sections: [
        {
          title: "Қандай деректер сақталады",
          body: [
            "Sapar Quest пайдаланушы атын, электрондық поштаны, аккаунт идентификаторын, аватарды, тест нәтижелерін, жетістіктерді, ашылған кезеңдерді және ҰБТ әрекеттерінің тарихын сақтай алады.",
            "Google арқылы кіру қолданылса, сайт Google берген расталған поштаны, есімді және профиль суретін алады.",
          ],
        },
        {
          title: "Деректер не үшін қажет",
          body: [
            "Деректер аккаунтқа кіру, прогресті сақтау, жетістіктерді көрсету, профильді қалпына келтіру және рейтинг жұмысы үшін қажет.",
            "Тест нәтижелері тек жобаның ішіндегі оқу статистикасы үшін қолданылады.",
          ],
        },
        {
          title: "Деректер қалай қорғалады",
          body: [
            "Құпиясөздер ашық түрде сақталмайды. Олар тұз қосылған хештеу арқылы сақталады.",
            "Дерекқорға қолжетімділікті жоба әкімшісі және хостинг баптаулары шектеуі керек.",
          ],
        },
        {
          title: "Деректерді беру",
          body: [
            "Sapar Quest пайдаланушылардың жеке деректерін сатпайды.",
            "Хостинг, дерекқор, Google арқылы кіру немесе ҰБТ AI талдауы сияқты техникалық сервистер деректерді тек сайт функцияларын қамтамасыз ету үшін өңдеуі мүмкін.",
          ],
        },
        {
          title: "Түзету және жою",
          body: [
            "Пайдаланушы деректерді түзету немесе жоюды жоба әкімшісі арқылы сұрай алады.",
            "Аккаунт жойылғаннан кейін прогресс, тест әрекеттері және жетістіктер жұмыс дерекқорынан өшірілуі мүмкін.",
          ],
        },
      ],
    },
  },
  parents: {
    ru: {
      page_title: "Sapar Quest - Руководство для родителей",
      nav_home: "Главная",
      nav_map: "Карта",
      nav_leaderboard: "Рейтинг",
      badge: "Для семьи и школы",
      title: "Руководство для родителей",
      subtitle:
        "Sapar Quest создан как учебный квест по истории Казахстана. Здесь собрана краткая информация о безопасности и формате обучения.",
      updated: "Обновлено: 22 апреля 2026",
      sections: [
        {
          title: "Что делает сайт",
          body: [
            "Ученик изучает историю Казахстана через карту, периоды, города, тесты, достижения и подготовку к ЕНТ.",
            "Игровой прогресс помогает проходить материал последовательно: от первого периода к следующим.",
          ],
        },
        {
          title: "Регистрация и профиль",
          body: [
            "Аккаунт нужен для сохранения результатов, достижений, открытых периодов и истории ЕНТ.",
            "В профиле отображаются имя, почта, аватар, статистика и учебная активность.",
          ],
        },
        {
          title: "Рейтинг и достижения",
          body: [
            "Рейтинг показывает учебные результаты игроков по очкам и точности.",
            "Достижения выдаются за прохождение тестов и прогресс по периодам.",
          ],
        },
        {
          title: "Коммуникация между пользователями",
          body: [
            "В Sapar Quest нет встроенного чата между учениками.",
            "Пользователи не могут отправлять личные сообщения друг другу через сайт.",
          ],
        },
        {
          title: "Как помочь ребенку",
          body: [
            "Рекомендуется проходить тесты спокойно, читать пояснения и возвращаться к темам, где были ошибки.",
            "Для ЕНТ полезно смотреть разбор попытки и повторять темы, которые указаны в AI-анализе.",
          ],
        },
      ],
    },
    en: {
      page_title: "Sapar Quest - Parental Guide",
      nav_home: "Home",
      nav_map: "Map",
      nav_leaderboard: "Leaderboard",
      badge: "For families and schools",
      title: "Parental Guide",
      subtitle:
        "Sapar Quest is an educational quest about Kazakhstan's history. This page summarizes safety and learning format information.",
      updated: "Updated: April 22, 2026",
      sections: [
        {
          title: "What the site does",
          body: [
            "A learner studies Kazakhstan's history through a map, periods, cities, quizzes, achievements, and UNT preparation.",
            "Game progress helps students move through the material step by step, from the first period to later periods.",
          ],
        },
        {
          title: "Registration and profile",
          body: [
            "An account is needed to save results, achievements, unlocked periods, and UNT history.",
            "The profile shows the name, email, avatar, statistics, and learning activity.",
          ],
        },
        {
          title: "Leaderboard and achievements",
          body: [
            "The leaderboard shows learning results by score and accuracy.",
            "Achievements are awarded for quiz completion and progress across historical periods.",
          ],
        },
        {
          title: "Communication between users",
          body: [
            "Sapar Quest does not include a built-in chat between students.",
            "Users cannot send private messages to each other through the site.",
          ],
        },
        {
          title: "How to help a child",
          body: [
            "Students should take quizzes calmly, read explanations, and return to topics where mistakes happened.",
            "For UNT preparation, it is useful to review each attempt and repeat the topics listed in the AI analysis.",
          ],
        },
      ],
    },
    kk: {
      page_title: "Sapar Quest - Ата-аналарға арналған нұсқаулық",
      nav_home: "Басты бет",
      nav_map: "Карта",
      nav_leaderboard: "Рейтинг",
      badge: "Отбасы және мектеп үшін",
      title: "Ата-аналарға арналған нұсқаулық",
      subtitle:
        "Sapar Quest Қазақстан тарихы бойынша оқу квесті ретінде жасалған. Бұл бетте қауіпсіздік пен оқу форматы туралы қысқаша ақпарат берілген.",
      updated: "Жаңартылды: 22 сәуір 2026",
      sections: [
        {
          title: "Сайт не істейді",
          body: [
            "Оқушы Қазақстан тарихын карта, кезеңдер, қалалар, тесттер, жетістіктер және ҰБТ дайындығы арқылы меңгереді.",
            "Ойын прогресі материалды бірінші кезеңнен кейінгі кезеңдерге дейін ретімен өтуге көмектеседі.",
          ],
        },
        {
          title: "Тіркелу және профиль",
          body: [
            "Аккаунт нәтижелерді, жетістіктерді, ашылған кезеңдерді және ҰБТ тарихын сақтау үшін қажет.",
            "Профильде аты, пошта, аватар, статистика және оқу белсенділігі көрсетіледі.",
          ],
        },
        {
          title: "Рейтинг және жетістіктер",
          body: [
            "Рейтинг ойыншылардың оқу нәтижелерін ұпай және дәлдік бойынша көрсетеді.",
            "Жетістіктер тесттерден өту және тарихи кезеңдер бойынша прогресс үшін беріледі.",
          ],
        },
        {
          title: "Пайдаланушылар арасындағы байланыс",
          body: [
            "Sapar Quest ішінде оқушыларға арналған чат жоқ.",
            "Пайдаланушылар сайт арқылы бір-біріне жеке хабарлама жібере алмайды.",
          ],
        },
        {
          title: "Балаға қалай көмектесуге болады",
          body: [
            "Тесттерді асықпай өтіп, түсіндірмелерді оқып, қате кеткен тақырыптарға қайта оралу ұсынылады.",
            "ҰБТ үшін әр әрекеттің талдауын қарап, AI талдауында көрсетілген тақырыптарды қайталау пайдалы.",
          ],
        },
      ],
    },
  },
  help: {
    ru: {
      page_title: "Sapar Quest - Центр поддержки",
      nav_home: "Главная",
      nav_map: "Карта",
      nav_leaderboard: "Рейтинг",
      badge: "Поддержка",
      title: "Центр поддержки",
      subtitle:
        "Здесь собраны основные ответы по работе сайта и официальные контакты поддержки Sapar Quest.",
      updated: "Поддержка проекта",
      sections: [
        {
          title: "Как начать",
          body: [
            "Создайте аккаунт или войдите через Google, затем перейдите на карту и начните с первого доступного исторического периода.",
            "После прохождения городских тестов текущего периода следующий период станет доступен автоматически.",
          ],
        },
        {
          title: "Если период закрыт",
          body: [
            "Период открывается после выполнения условий квеста: нужно пройти городские тесты предыдущего периода.",
            "Если прогресс не обновился, обновите страницу и проверьте, что вы вошли в тот же аккаунт.",
          ],
        },
        {
          title: "ЕНТ и AI-анализ",
          body: [
            "ЕНТ-тест сохраняется в профиле как отдельная попытка.",
            "В разборе попытки можно увидеть вопросы, выбранные ответы, правильные ответы и AI-анализ по темам для повторения.",
          ],
        },
        {
          title: "Что делать при проблеме со входом",
          body: [
            "Проверьте правильность почты и пароля. Для регистрации и входа принимаются популярные почтовые домены.",
            "Если Google-вход не открывается, возможно, администратору нужно проверить Google Client ID и разрешенный домен сайта.",
          ],
        },
        {
          title: "Как быстрее получить помощь",
          body: [
            "В обращении укажите страницу, где возникла проблема, почту аккаунта, устройство или браузер и приложите скриншот, если он помогает понять ситуацию.",
            "Для вопросов по аккаунту, прогрессу, тестам, AI-анализу и ошибкам сайта используйте контакты ниже.",
          ],
        },
      ],
    },
    en: {
      page_title: "Sapar Quest - Help Center",
      nav_home: "Home",
      nav_map: "Map",
      nav_leaderboard: "Leaderboard",
      badge: "Support",
      title: "Help Center",
      subtitle:
        "This page collects the main answers about using the site and the official Sapar Quest support contacts.",
      updated: "Project support",
      sections: [
        {
          title: "How to start",
          body: [
            "Create an account or sign in with Google, then open the map and start from the first available historical period.",
            "After completing the city quizzes for the current period, the next period unlocks automatically.",
          ],
        },
        {
          title: "If a period is locked",
          body: [
            "A period unlocks after the quest condition is met: the city tests from the previous period must be completed.",
            "If progress does not update, refresh the page and make sure you are signed in to the same account.",
          ],
        },
        {
          title: "UNT and AI analysis",
          body: [
            "Each UNT test is saved in the profile as a separate attempt.",
            "The attempt review shows questions, selected answers, correct answers, and AI analysis of topics to review.",
          ],
        },
        {
          title: "Sign-in issues",
          body: [
            "Check that the email and password are correct. Registration and sign-in accept common email domains.",
            "If Google sign-in does not open, the administrator may need to check the Google Client ID and the authorized site domain.",
          ],
        },
        {
          title: "How to get help faster",
          body: [
            "Include the page where the issue happened, the account email, your device or browser, and a screenshot if it helps explain the problem.",
            "Use the contacts below for account, progress, quizzes, AI analysis, and site error questions.",
          ],
        },
      ],
    },
    kk: {
      page_title: "Sapar Quest - Қолдау орталығы",
      nav_home: "Басты бет",
      nav_map: "Карта",
      nav_leaderboard: "Рейтинг",
      badge: "Қолдау",
      title: "Қолдау орталығы",
      subtitle:
        "Бұл бетте сайтты пайдалану бойынша негізгі жауаптар және Sapar Quest қолдауының ресми байланыстары берілген.",
      updated: "Жоба қолдауы",
      sections: [
        {
          title: "Қалай бастау керек",
          body: [
            "Аккаунт құрыңыз немесе Google арқылы кіріңіз, содан кейін картаға өтіп, бірінші қолжетімді тарихи кезеңнен бастаңыз.",
            "Ағымдағы кезеңнің қала тесттері аяқталғаннан кейін келесі кезең автоматты түрде ашылады.",
          ],
        },
        {
          title: "Кезең жабық болса",
          body: [
            "Кезең квест шарты орындалғанда ашылады: алдыңғы кезеңнің қала тесттері өтілуі керек.",
            "Прогресс жаңармаса, бетті жаңартып, дәл сол аккаунтпен кіргеніңізді тексеріңіз.",
          ],
        },
        {
          title: "ҰБТ және AI талдауы",
          body: [
            "Әр ҰБТ тесті профильде жеке әрекет ретінде сақталады.",
            "Әрекет талдауында сұрақтар, таңдалған жауаптар, дұрыс жауаптар және қай тақырыптарды қайталау керегі туралы AI талдауы көрсетіледі.",
          ],
        },
        {
          title: "Кіру мәселелері",
          body: [
            "Пошта мен құпиясөздің дұрыс екенін тексеріңіз. Тіркелу және кіру үшін кең таралған пошта домендері қабылданады.",
            "Google арқылы кіру ашылмаса, әкімші Google Client ID және рұқсат етілген сайт доменін тексеруі керек.",
          ],
        },
        {
          title: "Көмекті қалай тезірек алуға болады",
          body: [
            "Өтініште мәселе шыққан бетті, аккаунт поштасын, құрылғы немесе браузерді және қажет болса скриншотты көрсетіңіз.",
            "Аккаунт, прогресс, тесттер, AI талдауы және сайт қателері бойынша төмендегі байланыстарды пайдаланыңыз.",
          ],
        },
      ],
    },
  },
};

const contactText = {
  ru: {
    cardTitle: "Связаться с поддержкой",
    cardIntro: "Выберите удобный способ связи. Для быстрого ответа кратко опишите проблему и укажите почту аккаунта.",
    mainDeveloper: "Главный разработчик",
    assistant: "Помощник проекта",
    supportPhone: "Номер поддержки",
    telegram: "Telegram",
    whatsapp: "WhatsApp",
    emailSubject: "Обращение в поддержку Sapar Quest",
    emailBody:
      "Здравствуйте! Нужна помощь по Sapar Quest.%0A%0AПочта аккаунта:%0AСтраница, где возникла проблема:%0AОписание проблемы:%0AСкриншот или детали:",
    quickMessage:
      "Здравствуйте! Нужна помощь по Sapar Quest. Почта аккаунта: . Проблема: ",
  },
  en: {
    cardTitle: "Contact Support",
    cardIntro: "Choose a convenient contact method. For a faster reply, briefly describe the issue and include the account email.",
    mainDeveloper: "Lead developer",
    assistant: "Project assistant",
    supportPhone: "Support phone",
    telegram: "Telegram",
    whatsapp: "WhatsApp",
    emailSubject: "Sapar Quest support request",
    emailBody:
      "Hello! I need help with Sapar Quest.%0A%0AAccount email:%0APage where the issue happened:%0AIssue description:%0AScreenshot or details:",
    quickMessage:
      "Hello! I need help with Sapar Quest. Account email: . Issue: ",
  },
  kk: {
    cardTitle: "Қолдауға хабарласу",
    cardIntro: "Өзіңізге ыңғайлы байланыс тәсілін таңдаңыз. Жауап тезірек болуы үшін мәселені қысқаша жазып, аккаунт поштасын көрсетіңіз.",
    mainDeveloper: "Бас әзірлеуші",
    assistant: "Жоба көмекшісі",
    supportPhone: "Қолдау нөмірі",
    telegram: "Telegram",
    whatsapp: "WhatsApp",
    emailSubject: "Sapar Quest қолдауына өтініш",
    emailBody:
      "Сәлеметсіз бе! Sapar Quest бойынша көмек керек.%0A%0AАккаунт поштасы:%0AМәселе шыққан бет:%0AМәселенің сипаттамасы:%0AСкриншот немесе қосымша мәлімет:",
    quickMessage:
      "Сәлеметсіз бе! Sapar Quest бойынша көмек керек. Аккаунт поштасы: . Мәселе: ",
  },
};

const supportContacts = {
  leadEmail: "aldiyar220210@gmail.com",
  assistantEmail: "azamatik908@gmail.com",
  phoneDisplay: "+7 747 646 5285",
  phoneLink: "+77476465285",
  telegramHandle: "@Moukpu",
  telegramLink: "https://t.me/Moukpu",
  whatsappNumber: "77476465285",
};

let currentLanguage = getCurrentLanguage();

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getPageKey() {
  return document.body?.dataset.legalPage || "privacy";
}

function getTranslations() {
  const page = pageData[getPageKey()] || pageData.privacy;
  return page[currentLanguage] || page.ru;
}

function translate(key) {
  return getTranslations()[key] ?? pageData.privacy.ru[key] ?? key;
}

function buildGmailLink(email, subject, body) {
  return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body.replaceAll("%0A", "\n"))}`;
}

function buildWhatsappLink(message) {
  return `https://wa.me/${supportContacts.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

function renderContactLink({ href, icon, label, value }) {
  return `
    <a class="group flex items-center gap-4 rounded-[1.5rem] border border-surface-container bg-surface px-5 py-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary hover:bg-white hover:shadow-[0_12px_28px_rgba(0,102,104,0.10)]"
      href="${escapeHtml(href)}"
      target="_blank"
      rel="noopener noreferrer">
      <span class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-white font-black shadow-sm">
        ${icon.startsWith("symbol:")
          ? `<span class="material-symbols-outlined">${escapeHtml(icon.replace("symbol:", ""))}</span>`
          : escapeHtml(icon)}
      </span>
      <span class="min-w-0">
        <span class="block text-xs font-black uppercase tracking-widest text-primary">${escapeHtml(label)}</span>
        <span class="block break-words text-base font-bold text-on-surface">${escapeHtml(value)}</span>
      </span>
    </a>
  `;
}

function renderHelpContacts() {
  if (getPageKey() !== "help") return "";

  const labels = contactText[currentLanguage] || contactText.ru;
  const mailBody = labels.emailBody;
  const quickMessage = labels.quickMessage;
  const contactItems = [
    {
      href: buildGmailLink(supportContacts.leadEmail, labels.emailSubject, mailBody),
      icon: "symbol:mail",
      label: labels.mainDeveloper,
      value: supportContacts.leadEmail,
    },
    {
      href: buildGmailLink(supportContacts.assistantEmail, labels.emailSubject, mailBody),
      icon: "symbol:mail",
      label: labels.assistant,
      value: supportContacts.assistantEmail,
    },
    {
      href: `tel:${supportContacts.phoneLink}`,
      icon: "symbol:call",
      label: labels.supportPhone,
      value: supportContacts.phoneDisplay,
    },
    {
      href: supportContacts.telegramLink,
      icon: "TG",
      label: labels.telegram,
      value: supportContacts.telegramHandle,
    },
    {
      href: buildWhatsappLink(quickMessage),
      icon: "WA",
      label: labels.whatsapp,
      value: supportContacts.phoneDisplay,
    },
  ];

  return `
    <article class="bg-white rounded-[2rem] border border-primary/20 p-7 md:p-8 shadow-[0_14px_36px_rgba(46,47,45,0.06)]">
      <div class="mb-6">
        <h2 class="text-2xl font-black text-on-surface tracking-tight">${escapeHtml(labels.cardTitle)}</h2>
        <p class="mt-3 text-on-surface-variant text-base leading-relaxed font-medium">${escapeHtml(labels.cardIntro)}</p>
      </div>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${contactItems.map(renderContactLink).join("")}
      </div>
    </article>
  `;
}

function renderSections() {
  const host = document.querySelector("[data-legal-sections]");
  if (!host) return;

  const sectionsHtml = getTranslations()
    .sections.map(
      (section) => `
        <article class="bg-white rounded-[2rem] border border-surface-container p-7 md:p-8 shadow-[0_14px_36px_rgba(46,47,45,0.06)]">
          <h2 class="text-2xl font-black text-on-surface tracking-tight mb-4">${escapeHtml(section.title)}</h2>
          <div class="space-y-3">
            ${section.body
              .map(
                (paragraph) => `
                  <p class="text-on-surface-variant text-base leading-relaxed font-medium">${escapeHtml(paragraph)}</p>
                `
              )
              .join("")}
          </div>
        </article>
      `
    )
    .join("");

  host.innerHTML = `${sectionsHtml}${renderHelpContacts()}`;
}

function applyTranslations() {
  document.documentElement.lang = currentLanguage;
  document.title = translate("page_title");

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    if (element.closest("footer")) return;
    element.textContent = translate(element.dataset.i18n);
  });

  renderSections();
  markLanguageReady();
}

mountLanguageMenu({
  onChange: (language) => {
    currentLanguage = language;
    applyTranslations();
  },
});

applyTranslations();
