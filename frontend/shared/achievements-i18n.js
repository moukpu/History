const PERIOD_LABELS = {
  khanate_1465: {
    year: "1465",
    ru: "Казахское ханство",
    en: "Kazakh Khanate",
    kk: "Қазақ хандығы",
  },
  imperial_1731: {
    year: "1731",
    ru: "Раннее влияние Российской империи",
    en: "Early Russian imperial influence",
    kk: "Ресей империясының ерте ықпалы",
  },
  imperial_1868: {
    year: "1868",
    ru: "Позднеимперская административная реформа",
    en: "Late imperial administrative reform",
    kk: "Кейінгі империялық әкімшілік реформа",
  },
  soviet_1925: {
    year: "1925",
    ru: "Ранний советский период",
    en: "Early Soviet period",
    kk: "Ерте кеңестік кезең",
  },
  independence_1991: {
    year: "1991",
    ru: "Независимость",
    en: "Independence",
    kk: "Тәуелсіздік",
  },
  transition_1998: {
    year: "1998",
    ru: "Новая столица и переходный период",
    en: "New capital and transition period",
    kk: "Жаңа астана және өтпелі кезең",
  },
  modern_2025: {
    year: "2025",
    ru: "Современный Казахстан",
    en: "Modern Kazakhstan",
    kk: "Қазіргі Қазақстан",
  },
};

const STATIC_ACHIEVEMENTS = {
  first_city_pass: {
    ru: {
      name: "Первый пройденный город",
      description: "Успешно пройден первый городской тест.",
    },
    en: {
      name: "First City Completed",
      description: "The first city test has been completed successfully.",
    },
    kk: {
      name: "Алғашқы қала өтті",
      description: "Алғашқы қала тесті сәтті аяқталды.",
    },
  },
  first_period_complete: {
    ru: {
      name: "Первая эпоха закрыта",
      description: "Полностью пройден первый исторический период.",
    },
    en: {
      name: "First Era Completed",
      description: "The first historical period has been completed.",
    },
    kk: {
      name: "Алғашқы дәуір аяқталды",
      description: "Алғашқы тарихи кезең толық аяқталды.",
    },
  },
  timeline_explorer: {
    ru: {
      name: "Исследователь эпох",
      description: "Открыты и пройдены города как минимум в трёх разных периодах.",
    },
    en: {
      name: "Era Explorer",
      description: "Cities have been unlocked and completed in at least three different periods.",
    },
    kk: {
      name: "Дәуір зерттеушісі",
      description: "Кемінде үш түрлі кезеңдегі қалалар ашылып, сәтті өтті.",
    },
  },
  full_timeline_complete: {
    ru: {
      name: "Вся лента пройдена",
      description: "Полностью завершены все игровые периоды временной шкалы.",
    },
    en: {
      name: "Full Timeline Completed",
      description: "All playable periods on the timeline have been completed.",
    },
    kk: {
      name: "Уақыт жолы толық өтті",
      description: "Уақыт шкаласындағы барлық ойын кезеңдері толық аяқталды.",
    },
  },
  perfect_city_test: {
    ru: {
      name: "Идеальный результат",
      description: "Городской тест пройден без единой ошибки.",
    },
    en: {
      name: "Perfect Result",
      description: "A city test has been completed without a single mistake.",
    },
    kk: {
      name: "Мінсіз нәтиже",
      description: "Қала тесті бірде-бір қатесіз өтті.",
    },
  },
  fact_first_correct: {
    ru: {
      name: "Меткий выбор",
      description: "Правильно угадан первый город по факту.",
    },
    en: {
      name: "Sharp Choice",
      description: "The first city has been guessed correctly from a fact.",
    },
    kk: {
      name: "Дәл таңдау",
      description: "Факт бойынша алғашқы қала дұрыс табылды.",
    },
  },
  fact_correct_5: {
    ru: {
      name: "Следопыт эпох",
      description: "Правильно угаданы 5 городов по историческим фактам.",
    },
    en: {
      name: "Era Tracker",
      description: "Five cities have been guessed correctly from historical facts.",
    },
    kk: {
      name: "Дәуір іздеушісі",
      description: "Тарихи фактілер бойынша 5 қала дұрыс табылды.",
    },
  },
  fact_correct_10: {
    ru: {
      name: "Мастер фактов",
      description: "Правильно угаданы 10 городов по историческим фактам.",
    },
    en: {
      name: "Fact Master",
      description: "Ten cities have been guessed correctly from historical facts.",
    },
    kk: {
      name: "Факт шебері",
      description: "Тарихи фактілер бойынша 10 қала дұрыс табылды.",
    },
  },
};

const PERIOD_COMPLETE_CODES = {
  khanate_complete_1465: "khanate_1465",
  imperial_step_1731: "imperial_1731",
  imperial_step_1868: "imperial_1868",
  soviet_complete_1925: "soviet_1925",
  independence_complete_1991: "independence_1991",
  transition_complete_1998: "transition_1998",
  modern_complete_2025: "modern_2025",
};

function normalizeLanguage(language) {
  return ["ru", "en", "kk"].includes(language) ? language : "ru";
}

function getPeriodText(periodCode, language) {
  const period = PERIOD_LABELS[periodCode];
  if (!period) return { year: "", title: periodCode || "" };
  return {
    year: period.year,
    title: period[language] || period.ru,
  };
}

function translatePeriodComplete(periodCode, language) {
  const period = getPeriodText(periodCode, language);
  const label = period.year ? `${period.year} — ${period.title}` : period.title;

  if (language === "en") {
    return {
      name: `Quest Era Completed: ${period.year}`,
      description: `All city tests for "${label}" have been completed.`,
    };
  }

  if (language === "kk") {
    return {
      name: `Квест кезеңі аяқталды: ${period.year}`,
      description: `"${label}" кезеңіндегі барлық қала тесттері өтті.`,
    };
  }

  return {
    name: `Этап квеста завершён: ${period.year}`,
    description: `Пройдены все городские тесты периода «${label}».`,
  };
}

function translatePeriodMaster(periodCode, language) {
  const period = getPeriodText(periodCode, language);
  const label = period.year ? `${period.year} — ${period.title}` : period.title;

  if (language === "en") {
    return {
      name: `Era Master: ${period.year}`,
      description: `A 100% result has been earned in every city of "${label}".`,
    };
  }

  if (language === "kk") {
    return {
      name: `Дәуір шебері: ${period.year}`,
      description: `"${label}" кезеңіндегі барлық қалада 100% нәтиже алынды.`,
    };
  }

  return {
    name: `Мастер эпохи: ${period.year}`,
    description: `Во всех городах периода «${label}» получен результат 100%.`,
  };
}

function translateCityAchievement(achievement, language) {
  const city = achievement.city || achievement.name?.replace(/^.*: /, "") || "";

  if (language === "en") {
    return {
      name: `City Expert: ${city}`,
      description: `The city test for ${city} has been completed successfully.`,
    };
  }

  if (language === "kk") {
    return {
      name: `Қала білгірі: ${city}`,
      description: `${city} қаласы бойынша тест сәтті өтті.`,
    };
  }

  return {
    name: `Знаток города: ${city}`,
    description: `Успешно пройден тест по городу ${city}.`,
  };
}

export function translateAchievement(achievement, language = "ru") {
  if (!achievement) {
    return { name: "", description: "" };
  }

  const normalizedLanguage = normalizeLanguage(language);
  const code = achievement.code || "";
  const staticTranslation = STATIC_ACHIEVEMENTS[code]?.[normalizedLanguage];
  if (staticTranslation) {
    return staticTranslation;
  }

  const periodCompleteCode = PERIOD_COMPLETE_CODES[code];
  if (periodCompleteCode) {
    return translatePeriodComplete(periodCompleteCode, normalizedLanguage);
  }

  if (code.startsWith("period_master_")) {
    return translatePeriodMaster(code.replace("period_master_", ""), normalizedLanguage);
  }

  if (code.startsWith("city_")) {
    return translateCityAchievement(achievement, normalizedLanguage);
  }

  return {
    name: achievement.name || code,
    description: achievement.description || "",
  };
}
