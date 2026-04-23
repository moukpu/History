import asyncio
import json
import logging
import math
import os
import re
import secrets
from dataclasses import dataclass
from html import escape
from pathlib import Path
from typing import Any

import httpx

from .admin_tools import (
    delete_admin_user,
    get_admin_user,
    get_site_disabled,
    list_admin_achievements,
    list_admin_period_cities,
    list_admin_periods,
    list_admin_users,
    reset_admin_city_progress,
    set_admin_city_score,
    set_admin_period_unlocked,
    set_admin_username,
    set_site_disabled,
    toggle_admin_achievement,
)

USER_PAGE_SIZE = 6
ACHIEVEMENT_PAGE_SIZE = 7
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile").strip() or "llama-3.3-70b-versatile"
CJK_ARTIFACT_RE = re.compile(r"[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]")
LATIN_SCREENSHOT_RE = re.compile(r"\bscreenshot\b", re.IGNORECASE)
SUPPORTED_BOT_LANGUAGES = ("ru", "en", "kk")
BOT_LANGUAGE_NAMES = {
    "ru": "Русский",
    "en": "English",
    "kk": "Қазақша",
}
BOT_AI_LANGUAGE_NAMES = {
    "ru": "Russian",
    "en": "English",
    "kk": "Kazakh",
}

BOT_TEXTS = {
    "ru": {
        "screenshot_word": "скриншот",
        "language_prompt_title": "🌍 Выбор языка",
        "language_prompt_body": "Выбери язык бота. Потом его можно поменять в меню одной кнопкой.",
        "language_changed": "Язык бота изменён: {language}.",
        "menu_title": "🪐 Поддержка Sapar Quest",
        "menu_body": "Помогу с аккаунтом, картой, прогрессом, тестами, ЕНТ и ошибками сайта.\n\nВыбери тему ниже или напиши вопрос сообщением.",
        "faq_title": "📚 Частые вопросы",
        "faq_body": "Выбери вопрос и получи быстрый ответ.",
        "contacts_title": "📞 Контакты поддержки",
        "contacts_body": "Telegram-бот: @history_pamelsasa_bot\nEmail разработчика: aldiyar220210@gmail.com\nEmail помощника: azamatik908@gmail.com\nТелефон/WhatsApp: +7 747 646 5285\n\nДля быстрого ответа укажи почту аккаунта, страницу сайта и что именно произошло.",
        "ask_ai_prompt": "✍️ Напиши вопрос одним сообщением.\nЖелательно сразу указать почту аккаунта, страницу и что произошло.",
        "ask_more_prompt": "🔎 Опиши проблему подробнее одним сообщением: что нажал, на какой странице, какой текст ошибки видишь и что уже пробовал.",
        "operator_prompt": "🧾 Отправь одно сообщение для оператора: почта аккаунта, страница, описание проблемы. Если есть скриншот или видео, приложи их в этом же сообщении.",
        "operator_need_details": "Нужно одно сообщение для оператора: почта аккаунта, что произошло, на какой странице ошибка. При необходимости приложи файл, фото или видео в этом же сообщении.",
        "operator_sent": "✅ Обращение передано оператору. Он увидит описание, Telegram пользователя и все вложения, если они были отправлены.",
        "ai_unavailable": "AI-поддержка временно недоступна. Напиши почту аккаунта, страницу и описание проблемы, чтобы оператор мог проверить её вручную.",
        "ai_second_try_offer": "Если проблема всё ещё не решена, я могу сразу передать обращение оператору.",
        "feedback_thanks": "✅ Спасибо за обратную связь. Если понадобится ещё помощь, можно сразу выбрать тему ниже.",
        "stale_button": "Кнопка устарела. Открой меню заново.",
        "cancelled": "Отменено.",
        "button_account": "👤 Аккаунт",
        "button_progress": "🗺️ Прогресс",
        "button_quiz": "🧠 Тесты/ЕНТ",
        "button_bug": "🛠 Ошибка сайта",
        "button_ai": "✨ Спросить ИИ",
        "button_faq": "📚 FAQ",
        "button_contacts": "📞 Контакты",
        "button_language": "🌍 Язык",
        "button_back": "⬅️ Назад",
        "button_back_faq": "⬅️ К FAQ",
        "button_menu": "🏠 В меню",
        "button_helped": "✅ Помог",
        "button_not_helped": "❌ Не помог",
        "button_operator": "👨‍💻 Оператор",
        "button_ask_ai": "✨ Задать вопрос ИИ",
        "topic_account_title": "👤 Аккаунт и вход",
        "topic_account_body": "Помогу с регистрацией, входом через Google, почтой, ником, аватаркой и восстановлением доступа.",
        "topic_progress_title": "🗺️ Прогресс и карта",
        "topic_progress_body": "Помогу понять, почему период или город не открыт, почему не засчитался тест и где пропали достижения.",
        "topic_quiz_title": "🧠 Тесты и ЕНТ",
        "topic_quiz_body": "Помогу с городскими тестами, таймером, результатами ЕНТ и разбором попыток.",
        "topic_bug_title": "🛠 Ошибка сайта",
        "topic_bug_body": "Опиши страницу, действие, текст ошибки, устройство и браузер. Если есть скриншот или видео, тоже отправь.",
        "faq_start_title": "Как начать игру?",
        "faq_start_answer": "Создай аккаунт или войди через Google, затем открой карту. Квест начинается с первого периода. После прохождения тестов периода следующий период откроется автоматически.",
        "faq_locked_title": "Почему период закрыт?",
        "faq_locked_answer": "Периоды открываются по порядку. Нужно пройти все городские тесты предыдущего периода. Если период уже должен быть открыт, обнови страницу и проверь, что ты вошёл в тот же аккаунт.",
        "faq_profile_title": "Почему не виден прогресс?",
        "faq_profile_answer": "Прогресс хранится в аккаунте. Войди в тот же профиль, с которого проходил тесты. Если профиль не обновился, перезагрузи страницу и проверь ещё раз.",
        "faq_ent_title": "Как работает ЕНТ-тест?",
        "faq_ent_answer": "ЕНТ-тест идёт 10 минут и сохраняется в профиле как отдельная попытка. После попытки можно открыть разбор с вопросами, ответами и AI-анализом.",
        "faq_google_title": "Не работает вход через Google",
        "faq_google_answer": "Чаще всего проблема связана с Google Client ID или разрешённым доменом. Попробуй обычный вход по почте. Если ошибка повторяется, пришли текст ошибки или скриншот.",
        "faq_leaderboard_title": "Как считается рейтинг?",
        "faq_leaderboard_answer": "Рейтинг учитывает городской прогресс, достижения и точность по городским тестам. Попытки ЕНТ в точность рейтинга не входят. Точность в профиле и рейтинге считается как среднее арифметическое процентов по всем городским тестам, затем округляется до целого. Пример: 50% и 75% дадут 63%.",
    },
    "en": {
        "screenshot_word": "screenshot",
        "language_prompt_title": "🌍 Language",
        "language_prompt_body": "Choose the bot language. You can change it later from the menu with one button.",
        "language_changed": "Bot language updated: {language}.",
        "menu_title": "🪐 Sapar Quest Support",
        "menu_body": "I can help with your account, map, progress, quizzes, UNT, and site errors.\n\nChoose a topic below or send your question as a message.",
        "faq_title": "📚 FAQ",
        "faq_body": "Choose a question to get a quick answer.",
        "contacts_title": "📞 Support Contacts",
        "contacts_body": "Telegram bot: @history_pamelsasa_bot\nLead developer email: aldiyar220210@gmail.com\nAssistant email: azamatik908@gmail.com\nPhone/WhatsApp: +7 747 646 5285\n\nFor a faster reply, include your account email, the page, and what exactly happened.",
        "ask_ai_prompt": "✍️ Send your question in one message.\nIt is better to include your account email, the page, and what happened.",
        "ask_more_prompt": "🔎 Please describe the issue in more detail in one message: what you clicked, which page, what error text you see, and what you already tried.",
        "operator_prompt": "🧾 Send one message for the operator: account email, page, and issue description. If you have a screenshot or video, attach it to the same message.",
        "operator_need_details": "The operator needs one message: account email, what happened, and on which page the error appeared. You can also attach a file, photo, or video.",
        "operator_sent": "✅ Your request has been sent to the operator. They will see your description, Telegram account, and all attachments if you sent them.",
        "ai_unavailable": "AI support is temporarily unavailable. Send your account email, the page, and the issue description so the operator can review it manually.",
        "ai_second_try_offer": "If this still does not solve the issue, I can send your request directly to the operator.",
        "feedback_thanks": "✅ Thanks for the feedback. If you need more help, just choose another topic below.",
        "stale_button": "This button is outdated. Open the menu again.",
        "cancelled": "Cancelled.",
        "button_account": "👤 Account",
        "button_progress": "🗺️ Progress",
        "button_quiz": "🧠 Quizzes/UNT",
        "button_bug": "🛠 Site Error",
        "button_ai": "✨ Ask AI",
        "button_faq": "📚 FAQ",
        "button_contacts": "📞 Contacts",
        "button_language": "🌍 Language",
        "button_back": "⬅️ Back",
        "button_back_faq": "⬅️ Back to FAQ",
        "button_menu": "🏠 Menu",
        "button_helped": "✅ Helped",
        "button_not_helped": "❌ Not Helped",
        "button_operator": "👨‍💻 Operator",
        "button_ask_ai": "✨ Ask AI",
        "topic_account_title": "👤 Account and Sign In",
        "topic_account_body": "I can help with registration, Google sign-in, email, nickname, avatar, and access recovery.",
        "topic_progress_title": "🗺️ Progress and Map",
        "topic_progress_body": "I can help you understand why a period or city is locked, why a test was not counted, or why achievements are missing.",
        "topic_quiz_title": "🧠 Quizzes and UNT",
        "topic_quiz_body": "I can help with city quizzes, timers, UNT results, and attempt review.",
        "topic_bug_title": "🛠 Site Error",
        "topic_bug_body": "Describe the page, action, error text, device, and browser. If you have a screenshot or video, send it too.",
        "faq_start_title": "How do I start the game?",
        "faq_start_answer": "Create an account or sign in with Google, then open the map. The quest starts from the first period. After you complete that period, the next one unlocks automatically.",
        "faq_locked_title": "Why is a period locked?",
        "faq_locked_answer": "Periods unlock in order. You need to complete all city tests from the previous period. If it should already be open, refresh the page and make sure you are in the same account.",
        "faq_profile_title": "Why is my progress missing?",
        "faq_profile_answer": "Progress is stored in your account. Sign in with the same profile you used for the tests. If the profile did not update, refresh the page and check again.",
        "faq_ent_title": "How does the UNT test work?",
        "faq_ent_answer": "The UNT test lasts 10 minutes and is saved in your profile as a separate attempt. After that, you can open a review with questions, answers, and AI analysis.",
        "faq_google_title": "Google sign-in does not work",
        "faq_google_answer": "This is usually related to Google Client ID or an allowed domain. Try regular email login. If the error repeats, send the exact error text or a screenshot.",
        "faq_leaderboard_title": "How is the leaderboard calculated?",
        "faq_leaderboard_answer": "The leaderboard uses city progress, achievements, and city-test accuracy. UNT attempts are not included in leaderboard accuracy. Profile and leaderboard accuracy are calculated as the arithmetic mean of all city-test percentages, then rounded to a whole number. Example: 50% and 75% become 63%.",
    },
    "kk": {
        "screenshot_word": "скриншот",
        "language_prompt_title": "🌍 Тіл таңдау",
        "language_prompt_body": "Бот тілін таңда. Кейін оны мәзірден бір батырмамен өзгертуге болады.",
        "language_changed": "Бот тілі өзгертілді: {language}.",
        "menu_title": "🪐 Sapar Quest қолдауы",
        "menu_body": "Аккаунт, карта, прогресс, тесттер, ҰБТ және сайт қателері бойынша көмектесемін.\n\nТөменнен тақырыпты таңда немесе сұрағыңды хабарламамен жібер.",
        "faq_title": "📚 Жиі сұрақтар",
        "faq_body": "Жылдам жауап алу үшін сұрақты таңда.",
        "contacts_title": "📞 Қолдау байланыстары",
        "contacts_body": "Telegram-бот: @history_pamelsasa_bot\nБас әзірлеуші email: aldiyar220210@gmail.com\nКөмекші email: azamatik908@gmail.com\nТелефон/WhatsApp: +7 747 646 5285\n\nЖылдам жауап үшін аккаунт поштасын, бетті және не болғанын жаз.",
        "ask_ai_prompt": "✍️ Сұрағыңды бір хабарламамен жібер.\nМүмкін болса, аккаунт поштасын, бетті және не болғанын қоса жаз.",
        "ask_more_prompt": "🔎 Мәселені толығырақ бір хабарламамен жаз: не бастың, қай бетте болды, қандай қате шықты және не жасап көрдің.",
        "operator_prompt": "🧾 Операторға бір хабарлама жібер: аккаунт поштасы, бет және мәселе сипаттамасы. Скриншот не видео болса, сол хабарламаға тірке.",
        "operator_need_details": "Операторға бір хабарлама керек: аккаунт поштасы, не болғаны және қате шыққан бет. Қажет болса файл, фото немесе видеоны да тірке.",
        "operator_sent": "✅ Өтініш операторға жіберілді. Ол сенің сипаттамаңды, Telegram аккаунтыңды және барлық тіркемелерді көреді.",
        "ai_unavailable": "AI қолдауы уақытша қолжетімсіз. Оператор тексеруі үшін аккаунт поштасын, бетті және мәселе сипаттамасын жібер.",
        "ai_second_try_offer": "Егер мәселе әлі шешілмесе, өтінішті операторға бірден жібере аламын.",
        "feedback_thanks": "✅ Кері байланысқа рахмет. Қажет болса, төменнен басқа тақырыпты таңда.",
        "stale_button": "Бұл батырма ескірген. Мәзірді қайта аш.",
        "cancelled": "Бас тартылды.",
        "button_account": "👤 Аккаунт",
        "button_progress": "🗺️ Прогресс",
        "button_quiz": "🧠 Тесттер/ҰБТ",
        "button_bug": "🛠 Сайт қатесі",
        "button_ai": "✨ AI-дан сұрау",
        "button_faq": "📚 FAQ",
        "button_contacts": "📞 Байланыс",
        "button_language": "🌍 Тіл",
        "button_back": "⬅️ Артқа",
        "button_back_faq": "⬅️ FAQ-қа қайту",
        "button_menu": "🏠 Мәзір",
        "button_helped": "✅ Көмектесті",
        "button_not_helped": "❌ Көмектеспеді",
        "button_operator": "👨‍💻 Оператор",
        "button_ask_ai": "✨ AI-ға сұрақ",
        "topic_account_title": "👤 Аккаунт және кіру",
        "topic_account_body": "Тіркелу, Google арқылы кіру, пошта, ник, аватар және қолжетімділікті қалпына келтіру бойынша көмектесемін.",
        "topic_progress_title": "🗺️ Прогресс және карта",
        "topic_progress_body": "Неге кезең не қала ашылмай тұр, неге тест есептелмеді немесе жетістіктер неге көрінбейді - соны түсінуге көмектесемін.",
        "topic_quiz_title": "🧠 Тесттер және ҰБТ",
        "topic_quiz_body": "Қала тесттері, таймер, ҰБТ нәтижелері және талдау бойынша көмектесемін.",
        "topic_bug_title": "🛠 Сайт қатесі",
        "topic_bug_body": "Бетті, әрекетті, қате мәтінін, құрылғы мен браузерді жаз. Скриншот не видео болса, оны да жібер.",
        "faq_start_title": "Ойынды қалай бастаймын?",
        "faq_start_answer": "Аккаунт жаса немесе Google арқылы кір, содан кейін картаны аш. Квест бірінші кезеңнен басталады. Кезең біткен соң келесі кезең автоматты түрде ашылады.",
        "faq_locked_title": "Неге кезең жабық?",
        "faq_locked_answer": "Кезеңдер ретімен ашылады. Алдыңғы кезеңдегі барлық қала тесттерін өту керек. Егер ол ашық болуы тиіс болса, бетті жаңартып, сол аккаунтпен кіргеніңді тексер.",
        "faq_profile_title": "Неге прогресс көрінбейді?",
        "faq_profile_answer": "Прогресс аккаунтта сақталады. Тест тапсырған сол профильге кір. Егер профиль жаңармаса, бетті қайта жүктеп, тағы тексер.",
        "faq_ent_title": "ҰБТ тесті қалай жұмыс істейді?",
        "faq_ent_answer": "ҰБТ тесті 10 минутқа созылады және профильде жеке талпыныс ретінде сақталады. Кейін сұрақтар, жауаптар және AI талдауы бар шолуды ашуға болады.",
        "faq_google_title": "Google арқылы кіру жұмыс істемейді",
        "faq_google_answer": "Көбіне мәселе Google Client ID немесе рұқсат етілген доменге байланысты болады. Әдеттегі email кіруін қолданып көр. Қате қайталанса, нақты қате мәтінін не скриншот жібер.",
        "faq_leaderboard_title": "Рейтинг қалай есептеледі?",
        "faq_leaderboard_answer": "Рейтинг қала прогресін, жетістіктерді және қала тесттерінің дәлдігін есептейді. ҰБТ талпыныстары рейтинг дәлдігіне кірмейді. Профиль мен рейтингтегі дәлдік барлық қала тесттері пайыздарының арифметикалық орташа мәні арқылы есептеледі де, кейін бүтін санға дейін дөңгелектенеді. Мысал: 50% және 75% болса, нәтиже 63% болады.",
    },
}

SUPPORT_FAQ = [
    {
        "key": "start",
        "title": "Как начать игру?",
        "answer": (
            "Создай аккаунт или войди через Google, затем открой карту. "
            "Квест начинается с первого периода. После прохождения городских тестов периода "
            "следующий период открывается автоматически."
        ),
    },
    {
        "key": "locked",
        "title": "Почему период закрыт?",
        "answer": (
            "Периоды открываются по порядку. Нужно пройти все городские тесты предыдущего периода. "
            "Если период должен быть открыт, обнови страницу и проверь, что ты вошёл в тот же аккаунт."
        ),
    },
    {
        "key": "profile",
        "title": "Почему не виден прогресс?",
        "answer": (
            "Прогресс хранится в аккаунте. Войди в тот же профиль, с которого проходил тесты. "
            "Если тест был пройден, но профиль не обновился, перезагрузи страницу и повтори проверку."
        ),
    },
    {
        "key": "ent",
        "title": "Как работает ЕНТ-тест?",
        "answer": (
            "ЕНТ-тест идёт 10 минут и сохраняется в профиле как отдельная попытка. "
            "После попытки можно открыть разбор: вопросы, выбранные ответы, правильные ответы и AI-анализ."
        ),
    },
    {
        "key": "google",
        "title": "Не работает вход через Google",
        "answer": (
            "Обычно проблема связана с настройкой Google Client ID или разрешённым доменом. "
            "Попробуй обычный вход по почте. Если ошибка повторяется, напиши в поддержку текст ошибки."
        ),
    },
    {
        "key": "leaderboard",
        "title": "Как считается рейтинг?",
        "answer": (
            "Рейтинг берёт прогресс городских тестов, достижения и точность по городским тестам. "
            "ЕНТ-попытки в точность рейтинга не входят."
        ),
    },
]

SUPPORT_TOPICS = {
    "account": (
        "Аккаунт и вход",
        "Помогу с регистрацией, Google-входом, почтой, ником, аватаркой и восстановлением доступа.",
    ),
    "progress": (
        "Прогресс и карта",
        "Помогу понять, почему период или город не открыт, почему не засчитался тест или не видны достижения.",
    ),
    "quiz": (
        "Тесты и ЕНТ",
        "Помогу с городскими тестами, таймером, результатами ЕНТ и AI-разбором попыток.",
    ),
    "bug": (
        "Ошибка сайта",
        "Опиши страницу, действие, текст ошибки, устройство и браузер. Если есть скриншот, его тоже можно отправить.",
    ),
}


def _parse_admin_ids(raw_value: str) -> set[int]:
    ids: set[int] = set()
    for chunk in raw_value.replace(";", ",").split(","):
        value = chunk.strip()
        if not value:
            continue
        try:
            ids.add(int(value))
        except ValueError:
            continue
    return ids


def _short(value: str, limit: int = 28) -> str:
    value = " ".join(str(value or "").split())
    return value if len(value) <= limit else f"{value[: limit - 1]}…"


@dataclass
class TelegramAdminRuntime:
    task: asyncio.Task
    stop_event: asyncio.Event

    async def stop(self) -> None:
        self.stop_event.set()
        self.task.cancel()
        try:
            await self.task
        except asyncio.CancelledError:
            pass


class TelegramAdminBot:
    def __init__(
        self,
        *,
        db_path: str | Path,
        token: str,
        admin_ids: set[int],
        stop_event: asyncio.Event,
        logger: logging.Logger,
    ) -> None:
        self.db_path = db_path
        self.token = token
        self.admin_ids = admin_ids
        self.stop_event = stop_event
        self.logger = logger
        self.api_base = f"https://api.telegram.org/bot{token}"
        self.offset = 0
        self.actions: dict[str, dict[str, Any]] = {}
        self.waiting: dict[int, dict[str, Any]] = {}
        self.support_context: dict[int, str] = {}
        self.support_sessions: dict[int, dict[str, int | str]] = {}
        self.user_languages: dict[int, str] = {}

    def _is_admin(self, payload: dict[str, Any]) -> bool:
        from_user = payload.get("from") or {}
        chat = payload.get("chat") or payload.get("message", {}).get("chat") or {}
        return int(from_user.get("id") or 0) in self.admin_ids or int(chat.get("id") or 0) in self.admin_ids

    def _action(self, action: str, **payload: Any) -> str:
        if len(self.actions) > 900:
            for key in list(self.actions)[:300]:
                self.actions.pop(key, None)
        token = secrets.token_urlsafe(6)
        self.actions[token] = {"action": action, **payload}
        return f"x:{token}"

    def _button(self, text: str, action: str, **payload: Any) -> dict[str, str]:
        return {"text": text, "callback_data": self._action(action, **payload)}

    def _keyboard(self, rows: list[list[dict[str, str]]]) -> dict[str, Any]:
        return {"inline_keyboard": rows}

    def _is_support_action(self, action: str) -> bool:
        return action in {
            "support_main",
            "support_language",
            "support_set_language",
            "support_faq",
            "support_faq_item",
            "support_topic",
            "support_ai_start",
            "support_contacts",
            "support_feedback_helped",
            "support_feedback_retry",
            "support_operator_start",
        }

    def _get_chat_language(self, chat_id: int) -> str:
        language = str(self.user_languages.get(chat_id, "ru"))
        return language if language in SUPPORTED_BOT_LANGUAGES else "ru"

    def _set_chat_language(self, chat_id: int, language: str) -> str:
        normalized = language if language in SUPPORTED_BOT_LANGUAGES else "ru"
        self.user_languages[chat_id] = normalized
        return normalized

    def _t(self, chat_id: int, key: str, **params: Any) -> str:
        language = self._get_chat_language(chat_id)
        template = BOT_TEXTS.get(language, BOT_TEXTS["ru"]).get(key, BOT_TEXTS["ru"].get(key, key))
        return template.format(**params) if params else template

    def _faq_items(self, chat_id: int) -> list[dict[str, str]]:
        return [
            {
                "key": "start",
                "title": self._t(chat_id, "faq_start_title"),
                "answer": self._t(chat_id, "faq_start_answer"),
            },
            {
                "key": "locked",
                "title": self._t(chat_id, "faq_locked_title"),
                "answer": self._t(chat_id, "faq_locked_answer"),
            },
            {
                "key": "profile",
                "title": self._t(chat_id, "faq_profile_title"),
                "answer": self._t(chat_id, "faq_profile_answer"),
            },
            {
                "key": "ent",
                "title": self._t(chat_id, "faq_ent_title"),
                "answer": self._t(chat_id, "faq_ent_answer"),
            },
            {
                "key": "google",
                "title": self._t(chat_id, "faq_google_title"),
                "answer": self._t(chat_id, "faq_google_answer"),
            },
            {
                "key": "leaderboard",
                "title": self._t(chat_id, "faq_leaderboard_title"),
                "answer": self._t(chat_id, "faq_leaderboard_answer"),
            },
        ]

    def _topic_content(self, chat_id: int, topic: str) -> tuple[str, str]:
        key = topic if topic in {"account", "progress", "quiz", "bug"} else "bug"
        return (
            self._t(chat_id, f"topic_{key}_title"),
            self._t(chat_id, f"topic_{key}_body"),
        )

    def _support_rules(self, chat_id: int) -> list[str]:
        language = self._get_chat_language(chat_id)
        if language == "en":
            return [
                "Profile accuracy uses only city tests. UNT does not affect it.",
                "Leaderboard accuracy uses only city tests. UNT does not affect it.",
                "Profile and leaderboard accuracy are calculated as the arithmetic mean of all city-test percentages and then rounded to a whole number.",
                "Example: 50% and 75% become 63%.",
                "Periods unlock in sequence. The next period opens only after all city tests of the previous period are completed.",
                "The map should open on the latest unlocked period.",
            ]
        if language == "kk":
            return [
                "Профиль дәлдігіне тек қала тесттері кіреді. ҰБТ әсер етпейді.",
                "Рейтинг дәлдігіне де тек қала тесттері кіреді. ҰБТ әсер етпейді.",
                "Профиль мен рейтинг дәлдігі барлық қала тесттері пайыздарының арифметикалық орташа мәні арқылы есептеліп, кейін бүтін санға дейін дөңгелектенеді.",
                "Мысал: 50% және 75% болса, нәтиже 63% болады.",
                "Кезеңдер ретімен ашылады. Келесі кезең алдыңғы кезеңнің барлық қала тесттері аяқталғаннан кейін ғана ашылады.",
                "Карта соңғы ашылған кезеңде ашылуы керек.",
            ]
        return [
            "Точность профиля считается только по городским тестам. ЕНТ не влияет.",
            "Точность рейтинга тоже считается только по городским тестам. ЕНТ не влияет.",
            "Точность профиля и рейтинга считается как среднее арифметическое процентов по всем городским тестам, затем округляется до целого.",
            "Пример: 50% и 75% дадут 63%.",
            "Периоды открываются по порядку. Следующий период открывается только после прохождения всех городских тестов предыдущего периода.",
            "Карта должна открываться на последнем разблокированном периоде.",
        ]

    def _language_keyboard(self) -> dict[str, Any]:
        return self._keyboard(
            [[
                self._button("🇷🇺 Русский", "support_set_language", language="ru"),
                self._button("🇬🇧 English", "support_set_language", language="en"),
                self._button("🇰🇿 Қазақша", "support_set_language", language="kk"),
            ]]
        )

    def _get_support_session(self, chat_id: int) -> dict[str, int | str]:
        session = self.support_sessions.get(chat_id)
        if session is None:
            session = {
                "ai_attempts": 0,
                "helped_count": 0,
                "not_helped_count": 0,
                "operator_tickets": 0,
                "topic": "",
            }
            self.support_sessions[chat_id] = session
        return session

    def _reset_support_dialog(self, chat_id: int) -> None:
        session = self._get_support_session(chat_id)
        session["ai_attempts"] = 0
        session["topic"] = ""

    def _support_feedback_keyboard(self, chat_id: int) -> dict[str, Any]:
        session = self._get_support_session(chat_id)
        ai_attempts = int(session.get("ai_attempts", 0) or 0)
        if ai_attempts >= 2:
            return self._keyboard(
                [
                    [
                        self._button(self._t(chat_id, "button_helped"), "support_feedback_helped"),
                        self._button(self._t(chat_id, "button_operator"), "support_operator_start"),
                    ],
                    [
                        self._button(self._t(chat_id, "button_language"), "support_language"),
                        self._button(self._t(chat_id, "button_menu"), "support_main"),
                    ],
                ]
            )
        return self._keyboard(
            [
                [
                    self._button(self._t(chat_id, "button_helped"), "support_feedback_helped"),
                    self._button(self._t(chat_id, "button_not_helped"), "support_feedback_retry"),
                ],
                [
                    self._button(self._t(chat_id, "button_language"), "support_language"),
                    self._button(self._t(chat_id, "button_menu"), "support_main"),
                ],
            ]
        )

    def _support_message_text(self, message: dict[str, Any]) -> str:
        return str(message.get("text") or message.get("caption") or "").strip()

    def _message_has_attachment(self, message: dict[str, Any]) -> bool:
        return any(
            message.get(key)
            for key in ("photo", "video", "animation", "document", "audio", "voice", "video_note", "sticker")
        )

    async def _forward_message_attachments(self, operator_chat_id: int, message: dict[str, Any]) -> bool:
        sent_any = False

        photos = message.get("photo") or []
        if photos:
            await self._api(
                "sendPhoto",
                {
                    "chat_id": operator_chat_id,
                    "photo": photos[-1]["file_id"],
                    "caption": "Вложение пользователя: фото.",
                },
            )
            sent_any = True

        media_specs = (
            ("video", "sendVideo", "video", "Вложение пользователя: видео."),
            ("animation", "sendAnimation", "animation", "Вложение пользователя: GIF или анимация."),
            ("document", "sendDocument", "document", "Вложение пользователя: файл."),
            ("audio", "sendAudio", "audio", "Вложение пользователя: аудио."),
            ("voice", "sendVoice", "voice", "Вложение пользователя: голосовое сообщение."),
            ("video_note", "sendVideoNote", "video_note", None),
            ("sticker", "sendSticker", "sticker", None),
        )
        for message_key, method, payload_key, caption in media_specs:
            media = message.get(message_key)
            if not media:
                continue

            payload: dict[str, Any] = {
                "chat_id": operator_chat_id,
                payload_key: media["file_id"],
            }
            if caption:
                payload["caption"] = caption
            await self._api(method, payload)
            sent_any = True

        return sent_any

    def _contains_support_artifacts(self, text: str) -> bool:
        normalized = str(text or "").strip().lower()
        if not normalized:
            return True
        if CJK_ARTIFACT_RE.search(normalized):
            return True
        for char in normalized:
            code = ord(char)
            if char in "\n\r\t":
                continue
            if char.isascii():
                continue
            if 0x0400 <= code <= 0x052F:
                continue
            if char in "ёЁ№«»–—…":
                continue
            return True
        if "не полностью сформулировали вопрос" in normalized:
            return True
        if "полностью сформулировали вопрос" in normalized:
            return True
        if "это поможет мне лучше понять вашу проблему" in normalized:
            return True
        if "опишите подробнее проблему" in normalized and "какая ошибка возникает" in normalized:
            return True
        if normalized.count("пожалуйста") >= 2:
            return True
        if normalized.startswith("извините, но кажется"):
            return True
        return False

    def _clean_support_answer(self, chat_id: int, text: str) -> str:
        cleaned = str(text or "").strip()
        cleaned = LATIN_SCREENSHOT_RE.sub(self._t(chat_id, "screenshot_word"), cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        return cleaned

    def _build_support_fallback_answer(self, chat_id: int, question: str, topic: str = "") -> str:
        topic_label, _ = self._topic_content(chat_id, topic)
        question = str(question or "").strip()
        if question:
            return f"{topic_label}\n\n{self._t(chat_id, 'ask_more_prompt')}"
        return self._t(chat_id, "ask_ai_prompt")

    async def _api(self, method: str, payload: dict[str, Any] | None = None) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=35) as client:
            response = await client.post(f"{self.api_base}/{method}", json=payload or {})
            response.raise_for_status()
            return response.json()

    async def _send(self, chat_id: int, text: str, keyboard: dict[str, Any] | None = None) -> None:
        payload: dict[str, Any] = {
            "chat_id": chat_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }
        if keyboard:
            payload["reply_markup"] = keyboard
        await self._api("sendMessage", payload)

    async def _edit(
        self,
        chat_id: int,
        message_id: int,
        text: str,
        keyboard: dict[str, Any] | None = None,
    ) -> None:
        payload: dict[str, Any] = {
            "chat_id": chat_id,
            "message_id": message_id,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": True,
        }
        if keyboard:
            payload["reply_markup"] = keyboard
        try:
            await self._api("editMessageText", payload)
        except httpx.HTTPError:
            await self._send(chat_id, text, keyboard)

    async def _answer_callback(self, callback_id: str, text: str = "") -> None:
        payload: dict[str, Any] = {"callback_query_id": callback_id}
        if text:
            payload["text"] = text
        try:
            await self._api("answerCallbackQuery", payload)
        except httpx.HTTPError:
            pass

    def _support_keyboard(self, chat_id: int) -> dict[str, Any]:
        return self._keyboard(
            [
                [
                    self._button(self._t(chat_id, "button_account"), "support_topic", topic="account"),
                    self._button(self._t(chat_id, "button_progress"), "support_topic", topic="progress"),
                ],
                [
                    self._button(self._t(chat_id, "button_quiz"), "support_topic", topic="quiz"),
                    self._button(self._t(chat_id, "button_bug"), "support_topic", topic="bug"),
                ],
                [self._button(self._t(chat_id, "button_ai"), "support_ai_start")],
                [
                    self._button(self._t(chat_id, "button_faq"), "support_faq"),
                    self._button(self._t(chat_id, "button_contacts"), "support_contacts"),
                ],
                [self._button(self._t(chat_id, "button_language"), "support_language")],
            ]
        )

    async def _show_support_main(self, chat_id: int, message_id: int | None = None) -> None:
        self._reset_support_dialog(chat_id)
        text = f"<b>{escape(self._t(chat_id, 'menu_title'))}</b>\n\n{escape(self._t(chat_id, 'menu_body'))}"
        if message_id:
            await self._edit(chat_id, message_id, text, self._support_keyboard(chat_id))
        else:
            await self._send(chat_id, text, self._support_keyboard(chat_id))

    async def _show_support_faq(self, chat_id: int, message_id: int) -> None:
        rows = [[self._button(item["title"], "support_faq_item", key=item["key"])] for item in self._faq_items(chat_id)]
        rows.append([
            self._button(self._t(chat_id, "button_back"), "support_main"),
            self._button(self._t(chat_id, "button_language"), "support_language"),
        ])
        await self._edit(
            chat_id,
            message_id,
            f"<b>{escape(self._t(chat_id, 'faq_title'))}</b>\n{escape(self._t(chat_id, 'faq_body'))}",
            self._keyboard(rows),
        )

    async def _show_support_faq_item(self, chat_id: int, message_id: int, key: str) -> None:
        item = next((faq for faq in self._faq_items(chat_id) if faq["key"] == key), None)
        if not item:
            await self._show_support_faq(chat_id, message_id)
            return
        await self._edit(
            chat_id,
            message_id,
            f"<b>{escape(item['title'])}</b>\n\n{escape(item['answer'])}",
            self._keyboard(
                [
                    [self._button(self._t(chat_id, "button_ask_ai"), "support_ai_start", topic=key)],
                    [self._button(self._t(chat_id, "button_back_faq"), "support_faq")],
                ]
            ),
        )

    async def _show_support_topic(self, chat_id: int, message_id: int, topic: str) -> None:
        title, body = self._topic_content(chat_id, topic)
        self.support_context[chat_id] = topic
        self._get_support_session(chat_id)["topic"] = topic
        await self._edit(
            chat_id,
            message_id,
            (
                f"<b>{escape(title)}</b>\n\n"
                f"{escape(body)}\n\n"
                f"{escape(self._t(chat_id, 'ask_ai_prompt'))}"
            ),
            self._keyboard(
                [
                    [self._button(self._t(chat_id, "button_ask_ai"), "support_ai_start", topic=topic)],
                    [
                        self._button(self._t(chat_id, "button_back"), "support_main"),
                        self._button(self._t(chat_id, "button_language"), "support_language"),
                    ],
                ]
            ),
        )

    async def _show_support_contacts(self, chat_id: int, message_id: int) -> None:
        text = f"<b>{escape(self._t(chat_id, 'contacts_title'))}</b>\n\n{escape(self._t(chat_id, 'contacts_body'))}"
        await self._edit(
            chat_id,
            message_id,
            text,
            self._keyboard([[
                self._button(self._t(chat_id, "button_back"), "support_main"),
                self._button(self._t(chat_id, "button_language"), "support_language"),
            ]]),
        )

    async def _notify_operator(self, message: dict[str, Any], topic: str) -> None:
        if not self.admin_ids:
            return

        operator_chat_id = sorted(self.admin_ids)[0]
        from_user = message.get("from") or {}
        username = str(from_user.get("username") or "").strip()
        username_text = f"@{username}" if username else "не указан"
        full_name = " ".join(
            chunk for chunk in [str(from_user.get("first_name") or "").strip(), str(from_user.get("last_name") or "").strip()] if chunk
        ).strip() or "Не указано"
        user_id = int(from_user.get("id") or 0)
        body = self._support_message_text(message)
        topic_label = SUPPORT_TOPICS.get(topic, ("Общий вопрос", ""))[0]
        session = self._get_support_session(int(message["chat"]["id"]))

        summary = (
            "<b>Новое обращение к оператору Sapar Quest</b>\n\n"
            f"<b>Тема:</b> {escape(topic_label)}\n"
            f"<b>Пользователь:</b> {escape(full_name)}\n"
            f"<b>Username:</b> {escape(username_text)}\n"
            f"<b>Telegram ID:</b> <code>{user_id}</code>\n"
            f"<b>Попыток с ИИ:</b> {int(session.get('ai_attempts', 0) or 0)}\n"
            f"<b>Ответов 'не помог':</b> {int(session.get('not_helped_count', 0) or 0)}\n"
            f"<b>Сообщение:</b>\n{escape(body or 'Пользователь отправил вложение без текста.')}"
        )
        await self._send(operator_chat_id, summary)

        try:
            await self._api(
                "copyMessage",
                {
                    "chat_id": operator_chat_id,
                    "from_chat_id": int(message["chat"]["id"]),
                    "message_id": int(message["message_id"]),
                },
            )
            return
        except Exception:
            self.logger.exception("Telegram support copyMessage failed, falling back to direct media send.")

        try:
            sent_any = await self._forward_message_attachments(operator_chat_id, message)
            if sent_any:
                return
            self.logger.warning("Telegram support message had no forwardable attachment payload.")
        except Exception:
            self.logger.exception("Telegram support direct attachment forwarding failed.")

        photos = message.get("photo") or []
        if photos:
            await self._api(
                "sendPhoto",
                {
                    "chat_id": operator_chat_id,
                    "photo": photos[-1]["file_id"],
                    "caption": "Скриншот из обращения пользователя.",
                },
            )

        video = message.get("video")
        if video:
            await self._api(
                "sendVideo",
                {
                    "chat_id": operator_chat_id,
                    "video": video["file_id"],
                    "caption": "Видео из обращения пользователя.",
                },
            )

        animation = message.get("animation")
        if animation:
            await self._api(
                "sendAnimation",
                {
                    "chat_id": operator_chat_id,
                    "animation": animation["file_id"],
                    "caption": "GIF/анимация из обращения пользователя.",
                },
            )

        document = message.get("document")
        if document:
            await self._api(
                "sendDocument",
                {
                    "chat_id": operator_chat_id,
                    "document": document["file_id"],
                    "caption": "Вложение из обращения пользователя.",
                },
            )

    async def _submit_operator_ticket(self, message: dict[str, Any], topic: str = "") -> None:
        chat_id = int(message["chat"]["id"])
        body = self._support_message_text(message)
        has_attachment = self._message_has_attachment(message)
        if not body and not has_attachment:
            await self._send(
                chat_id,
                escape(self._t(chat_id, "operator_need_details")),
            )
            return

        session = self._get_support_session(chat_id)
        session["operator_tickets"] = int(session.get("operator_tickets", 0) or 0) + 1
        self.logger.info(
            "Telegram support operator ticket created.",
            extra={
                "chat_id": chat_id,
                "topic": topic or session.get("topic", ""),
                "operator_tickets": int(session["operator_tickets"]),
            },
        )
        await self._notify_operator(message, str(topic or session.get("topic", "")))
        self._reset_support_dialog(chat_id)
        await self._send(
            chat_id,
            escape(self._t(chat_id, "operator_sent")),
            self._support_keyboard(chat_id),
        )

    async def _answer_support_with_ai(self, chat_id: int, question: str, topic: str = "") -> None:
        question = question.strip()
        if not question:
            await self._show_support_main(chat_id)
            return

        session = self._get_support_session(chat_id)
        session["ai_attempts"] = int(session.get("ai_attempts", 0) or 0) + 1
        session["topic"] = str(topic or session.get("topic", "") or self.support_context.get(chat_id, ""))

        api_key = os.getenv("GROQ_API_KEY", "").strip()
        if not api_key:
            await self._send(
                chat_id,
                escape(self._t(chat_id, "ai_unavailable")),
                self._support_feedback_keyboard(chat_id),
            )
            return

        language = self._get_chat_language(chat_id)
        faq_text = "\n".join(f"- {item['title']}: {item['answer']}" for item in self._faq_items(chat_id))
        support_rules = "\n".join(f"- {item}" for item in self._support_rules(chat_id))
        topic_label, _ = self._topic_content(chat_id, topic)
        system_prompt = (
            "You are Sapar Quest support assistant. "
            f"Reply only in {BOT_AI_LANGUAGE_NAMES.get(language, 'Russian')}. "
            "Be concise, practical, and friendly. Use plain natural language. "
            "Never start with apologies and never say that the user did not fully formulate the question. "
            "Do not write generic support script phrases. Do not use foreign symbols or mixed-language artifacts. "
            "Keep answers short, concrete, and specific to the user's message. "
            "If the user asks a direct yes/no question, answer with yes/no in the first sentence. "
            "If the user asks about numbers, calculations, percentages, score, rating, or accuracy, give the exact rule and the final number directly without vague wording. "
            "Prefer one direct answer first, then one short explanation. "
            "Help only with Sapar Quest: account, Google login, map periods, "
            "city quizzes, UNT test, profile, achievements, leaderboard, AI analysis, and technical issues. "
            "Do not claim you changed data or accessed private account data. If account-specific action is needed, "
            "ask for account email, page, exact error, device/browser, and a screenshot. "
            "Project rules:\n" + support_rules + "\n\n"
            "Known FAQ:\n" + faq_text
        )
        payload = {
            "model": GROQ_MODEL,
            "messages": [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": f"Topic: {topic_label}\nUser question: {question}",
                },
            ],
            "temperature": 0.2,
            "max_tokens": 500,
        }
        try:
            async with httpx.AsyncClient(timeout=30) as client:
                response = await client.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {api_key}",
                        "Content-Type": "application/json",
                    },
                    content=json.dumps(payload),
                )
                response.raise_for_status()
                data = response.json()
                answer = self._clean_support_answer(chat_id, str(data["choices"][0]["message"]["content"]))
        except Exception:
            self.logger.exception("Telegram support AI failed.")
            answer = self._t(chat_id, "ai_unavailable")

        if self._contains_support_artifacts(answer):
            answer = self._build_support_fallback_answer(chat_id, question, topic)

        if len(answer) > 3500:
            answer = answer[:3490].rstrip() + "..."
        if int(session.get("ai_attempts", 0) or 0) >= 2:
            answer += "\n\n" + self._t(chat_id, "ai_second_try_offer")
        await self._send(chat_id, escape(answer), self._support_feedback_keyboard(chat_id))

    def _main_keyboard(self) -> dict[str, Any]:
        disabled = get_site_disabled(self.db_path)
        return self._keyboard(
            [
                [self._button("👥 Пользователи", "users", page=0)],
                [
                    self._button(
                        "🟢 Включить сайт" if disabled else "🔴 Выключить сайт",
                        "site_toggle",
                        disabled=not disabled,
                    )
                ],
            ]
        )

    async def _show_main(self, chat_id: int, message_id: int | None = None) -> None:
        disabled = get_site_disabled(self.db_path)
        text = (
            "<b>Sapar Quest admin</b>\n\n"
            f"Статус сайта: <b>{'выключен' if disabled else 'работает'}</b>\n"
            "Команды: /users, /find текст"
        )
        if message_id:
            await self._edit(chat_id, message_id, text, self._main_keyboard())
        else:
            await self._send(chat_id, text, self._main_keyboard())

    def _users_keyboard(self, page: int, total: int, query: str = "") -> dict[str, Any]:
        result = list_admin_users(
            self.db_path,
            page=page,
            page_size=USER_PAGE_SIZE,
            query=query or None,
        )
        rows: list[list[dict[str, str]]] = []
        for user in result["users"]:
            label = f"{_short(user['username'], 18)} • {_short(user['email'], 24)}"
            rows.append([self._button(label, "user", user_id=user["id"])])

        nav: list[dict[str, str]] = []
        if page > 0:
            nav.append(self._button("◀️", "users", page=page - 1, query=query))
        if (page + 1) * USER_PAGE_SIZE < total:
            nav.append(self._button("▶️", "users", page=page + 1, query=query))
        if nav:
            rows.append(nav)
        rows.append([self._button("⬅️ Меню", "main")])
        return self._keyboard(rows)

    async def _show_users(
        self,
        chat_id: int,
        message_id: int | None,
        *,
        page: int = 0,
        query: str = "",
    ) -> None:
        result = list_admin_users(
            self.db_path,
            page=page,
            page_size=USER_PAGE_SIZE,
            query=query or None,
        )
        total_pages = max(1, math.ceil(result["total"] / USER_PAGE_SIZE))
        title = "Пользователи"
        if query:
            title += f" по запросу «{escape(query)}»"
        text = f"<b>{title}</b>\nСтраница {page + 1}/{total_pages}. Всего: {result['total']}."
        keyboard = self._users_keyboard(page, result["total"], query)
        if message_id:
            await self._edit(chat_id, message_id, text, keyboard)
        else:
            await self._send(chat_id, text, keyboard)

    def _user_text(self, user_id: str) -> str:
        user = get_admin_user(self.db_path, user_id)
        if not user:
            return "Пользователь не найден."
        return (
            f"<b>{escape(user['username'])}</b>\n"
            f"Email: <code>{escape(user['email'])}</code>\n"
            f"ID: <code>{escape(user['id'])}</code>\n\n"
            f"Опыт: <b>{int(user['total_score'] or 0)} XP</b>\n"
            f"Попыток городов: <b>{int(user['total_tests'] or 0)}</b>\n"
            f"Пройдено городов: <b>{int(user['passed_cities'] or 0)}</b>\n"
            f"Ачивки: <b>{int(user['achievements_count'] or 0)}</b>\n"
            f"ЕНТ попыток: <b>{int(user['ent_attempts'] or 0)}</b>"
        )

    def _user_keyboard(self, user_id: str) -> dict[str, Any]:
        return self._keyboard(
            [
                [
                    self._button("✏️ Ник", "username_start", user_id=user_id),
                    self._button("🏆 Ачивки", "achievements", user_id=user_id, page=0),
                ],
                [
                    self._button("🧭 Периоды/тесты", "periods", user_id=user_id),
                ],
                [
                    self._button("🗑 Удалить аккаунт", "delete_confirm", user_id=user_id),
                ],
                [self._button("⬅️ Пользователи", "users", page=0)],
            ]
        )

    async def _show_user(self, chat_id: int, message_id: int, user_id: str) -> None:
        await self._edit(chat_id, message_id, self._user_text(user_id), self._user_keyboard(user_id))

    async def _show_achievements(
        self,
        chat_id: int,
        message_id: int,
        user_id: str,
        page: int,
    ) -> None:
        result = list_admin_achievements(
            self.db_path,
            user_id,
            page=page,
            page_size=ACHIEVEMENT_PAGE_SIZE,
        )
        total_pages = max(1, math.ceil(result["total"] / ACHIEVEMENT_PAGE_SIZE))
        rows: list[list[dict[str, str]]] = []
        for item in result["achievements"]:
            prefix = "✅" if int(item["unlocked"]) else "▫️"
            rows.append(
                [
                    self._button(
                        f"{prefix} {_short(item['name'], 42)}",
                        "toggle_achievement",
                        user_id=user_id,
                        code=item["code"],
                        page=page,
                    )
                ]
            )
        nav: list[dict[str, str]] = []
        if page > 0:
            nav.append(self._button("◀️", "achievements", user_id=user_id, page=page - 1))
        if (page + 1) * ACHIEVEMENT_PAGE_SIZE < result["total"]:
            nav.append(self._button("▶️", "achievements", user_id=user_id, page=page + 1))
        if nav:
            rows.append(nav)
        rows.append([self._button("⬅️ Игрок", "user", user_id=user_id)])
        await self._edit(
            chat_id,
            message_id,
            f"<b>Ачивки игрока</b>\nСтраница {page + 1}/{total_pages}. Нажатие включает/убирает ачивку.",
            self._keyboard(rows),
        )

    async def _show_periods(self, chat_id: int, message_id: int, user_id: str) -> None:
        rows: list[list[dict[str, str]]] = []
        for period in list_admin_periods(self.db_path, user_id):
            marker = "🔓" if int(period["manually_unlocked"]) else "🧭"
            rows.append(
                [
                    self._button(
                        f"{marker} {period['year_label']} • {_short(period['title'], 28)}",
                        "period",
                        user_id=user_id,
                        period_code=period["code"],
                    )
                ]
            )
        rows.append([self._button("⬅️ Игрок", "user", user_id=user_id)])
        await self._edit(
            chat_id,
            message_id,
            "<b>Периоды и тесты</b>\nВыбери период, чтобы открыть города, менять прогресс или вручную разблокировать период.",
            self._keyboard(rows),
        )

    async def _show_period(self, chat_id: int, message_id: int, user_id: str, period_code: str) -> None:
        periods = {period["code"]: period for period in list_admin_periods(self.db_path, user_id)}
        period = periods.get(period_code)
        if not period:
            await self._edit(chat_id, message_id, "Период не найден.", self._keyboard([[self._button("⬅️ Игрок", "user", user_id=user_id)]]))
            return

        rows: list[list[dict[str, str]]] = [
            [
                self._button("🔓 Разблокировать", "period_unlock", user_id=user_id, period_code=period_code),
                self._button("♻️ Сброс unlock", "period_lock_reset", user_id=user_id, period_code=period_code),
            ]
        ]
        for city in list_admin_period_cities(self.db_path, user_id, period_code):
            status = "✅" if int(city["passed_count"] or 0) > 0 else "▫️"
            rows.append(
                [
                    self._button(
                        f"{status} {_short(city['display_name'], 24)} • {int(city['best_score'] or 0)}%",
                        "city",
                        user_id=user_id,
                        period_code=period_code,
                        city=city["city"],
                    )
                ]
            )
        rows.append([self._button("⬅️ Периоды", "periods", user_id=user_id)])
        text = f"<b>{escape(period['year_label'])} • {escape(period['title'])}</b>\nГорода периода и прогресс тестов."
        await self._edit(chat_id, message_id, text, self._keyboard(rows))

    async def _show_city(
        self,
        chat_id: int,
        message_id: int,
        user_id: str,
        period_code: str,
        city: str,
    ) -> None:
        rows = [
            [self._button("✅ Пройдено 100%", "city_pass", user_id=user_id, period_code=period_code, city=city)],
            [self._button("✏️ Поставить балл", "city_score_start", user_id=user_id, period_code=period_code, city=city)],
            [self._button("♻️ Сбросить город", "city_reset", user_id=user_id, period_code=period_code, city=city)],
            [self._button("⬅️ Период", "period", user_id=user_id, period_code=period_code)],
        ]
        text = (
            f"<b>{escape(city)}</b>\n"
            f"Период: <code>{escape(period_code)}</code>\n\n"
            "100% добавит город как пройденный и выдаст городскую ачивку. "
            "Сброс уберёт прогресс города и его городскую ачивку."
        )
        await self._edit(chat_id, message_id, text, self._keyboard(rows))

    async def _handle_waiting_text(self, message: dict[str, Any]) -> bool:
        from_user = message.get("from") or {}
        admin_id = int(from_user.get("id") or 0)
        state = self.waiting.get(admin_id)
        if not state:
            return False

        chat_id = int(message["chat"]["id"])
        text = self._support_message_text(message)
        if text.lower() in {"/cancel", "cancel", "отмена"}:
            self.waiting.pop(admin_id, None)
            await self._send(chat_id, escape(self._t(chat_id, "cancelled")))
            return True

        action = state.get("action")
        try:
            if action == "support_ai":
                self.waiting.pop(admin_id, None)
                await self._answer_support_with_ai(
                    chat_id,
                    text,
                    str(state.get("topic") or self.support_context.get(chat_id, "")),
                )
                return True

            if action == "support_operator_ticket":
                self.waiting.pop(admin_id, None)
                await self._submit_operator_ticket(
                    message,
                    str(state.get("topic") or self.support_context.get(chat_id, "")),
                )
                return True

            if not self._is_admin(message):
                self.waiting.pop(admin_id, None)
                return True

            if action == "set_username":
                user = set_admin_username(self.db_path, state["user_id"], text)
                self.waiting.pop(admin_id, None)
                if not user:
                    await self._send(chat_id, "Пользователь не найден.")
                    return True
                await self._send(
                    chat_id,
                    f"Ник изменён: <b>{escape(user['username'])}</b>",
                    self._user_keyboard(state["user_id"]),
                )
                return True

            if action == "set_city_score":
                score = int(text)
                if score < 0 or score > 100:
                    raise ValueError
                set_admin_city_score(
                    self.db_path,
                    state["user_id"],
                    state["period_code"],
                    state["city"],
                    score,
                )
                self.waiting.pop(admin_id, None)
                await self._send(
                    chat_id,
                    f"Балл обновлён: <b>{score}%</b> для {escape(state['city'])}.",
                )
                return True
        except ValueError:
            await self._send(chat_id, "Неверное значение. Отправь корректный текст или /cancel.")
            return True

        return False

    async def _handle_message(self, message: dict[str, Any]) -> None:
        chat_id = int(message["chat"]["id"])
        text = str(message.get("text") or "").strip()
        if text.startswith("/admin"):
            if self._is_admin(message):
                await self._show_main(chat_id)
            return

        if await self._handle_waiting_text(message):
            return

        if text.startswith("/start"):
            await self._send(
                chat_id,
                f"<b>{escape(BOT_TEXTS['ru']['language_prompt_title'])}</b>\n\n{escape(BOT_TEXTS['ru']['language_prompt_body'])}",
                self._language_keyboard(),
            )
            return

        if text.startswith("/help") or text.startswith("/language"):
            if chat_id not in self.user_languages:
                await self._send(
                    chat_id,
                    f"<b>{escape(BOT_TEXTS['ru']['language_prompt_title'])}</b>\n\n{escape(BOT_TEXTS['ru']['language_prompt_body'])}",
                    self._language_keyboard(),
                )
            else:
                await self._show_support_main(chat_id)
            return

        if text == "":
            await self._show_support_main(chat_id)
            return

        if self._is_admin(message) and text.startswith("/find"):
            query = text.replace("/find", "", 1).strip()
            await self._show_users(chat_id, None, page=0, query=query)
            return
        if self._is_admin(message) and text.startswith("/users"):
            await self._show_users(chat_id, None, page=0)
            return

        await self._answer_support_with_ai(chat_id, text, self.support_context.get(chat_id, ""))

    async def _handle_callback(self, callback: dict[str, Any]) -> None:
        callback_id = str(callback["id"])
        message = callback.get("message") or {}
        chat_id = int(message.get("chat", {}).get("id") or 0)
        message_id = int(message.get("message_id") or 0)
        from_user = callback.get("from") or {}
        admin_id = int(from_user.get("id") or 0)

        data = str(callback.get("data") or "")
        if not data.startswith("x:"):
            await self._answer_callback(callback_id, self._t(chat_id, "stale_button"))
            return
        payload = self.actions.get(data[2:])
        if not payload:
            await self._answer_callback(callback_id, self._t(chat_id, "stale_button"))
            return

        action = payload["action"]
        await self._answer_callback(callback_id)

        if self._is_support_action(action):
            if action == "support_main":
                await self._show_support_main(chat_id, message_id)
            elif action == "support_language":
                await self._edit(
                    chat_id,
                    message_id,
                    f"<b>{escape(BOT_TEXTS['ru']['language_prompt_title'])}</b>\n\n{escape(BOT_TEXTS['ru']['language_prompt_body'])}",
                    self._language_keyboard(),
                )
            elif action == "support_set_language":
                language = self._set_chat_language(chat_id, str(payload.get("language") or "ru"))
                await self._edit(
                    chat_id,
                    message_id,
                    escape(self._t(chat_id, "language_changed", language=BOT_LANGUAGE_NAMES[language])),
                    self._support_keyboard(chat_id),
                )
            elif action == "support_faq":
                await self._show_support_faq(chat_id, message_id)
            elif action == "support_faq_item":
                await self._show_support_faq_item(chat_id, message_id, str(payload.get("key") or ""))
            elif action == "support_topic":
                await self._show_support_topic(chat_id, message_id, str(payload.get("topic") or "bug"))
            elif action == "support_ai_start":
                session = self._get_support_session(chat_id)
                session["ai_attempts"] = 0
                session["topic"] = str(payload.get("topic") or self.support_context.get(chat_id, ""))
                self.waiting[admin_id] = {
                    "action": "support_ai",
                    "topic": str(session["topic"]),
                }
                await self._edit(
                    chat_id,
                    message_id,
                    escape(self._t(chat_id, "ask_ai_prompt")),
                    self._keyboard([[self._button(self._t(chat_id, "button_back"), "support_main")]]),
                )
            elif action == "support_contacts":
                await self._show_support_contacts(chat_id, message_id)
            elif action == "support_feedback_helped":
                session = self._get_support_session(chat_id)
                session["helped_count"] = int(session.get("helped_count", 0) or 0) + 1
                self.logger.info(
                    "Telegram support marked as helped.",
                    extra={"chat_id": chat_id, "helped_count": int(session["helped_count"])},
                )
                self._reset_support_dialog(chat_id)
                await self._edit(
                    chat_id,
                    message_id,
                    escape(self._t(chat_id, "feedback_thanks")),
                    self._support_keyboard(chat_id),
                )
            elif action == "support_feedback_retry":
                session = self._get_support_session(chat_id)
                session["not_helped_count"] = int(session.get("not_helped_count", 0) or 0) + 1
                self.logger.info(
                    "Telegram support marked as not helped.",
                    extra={"chat_id": chat_id, "not_helped_count": int(session["not_helped_count"])},
                )
                self.waiting[admin_id] = {
                    "action": "support_ai",
                    "topic": str(session.get("topic") or self.support_context.get(chat_id, "")),
                }
                await self._edit(
                    chat_id,
                    message_id,
                    escape(self._t(chat_id, "ask_more_prompt")),
                    self._keyboard([[self._button(self._t(chat_id, "button_back"), "support_main")]]),
                )
            elif action == "support_operator_start":
                session = self._get_support_session(chat_id)
                self.waiting[admin_id] = {
                    "action": "support_operator_ticket",
                    "topic": str(session.get("topic") or self.support_context.get(chat_id, "")),
                }
                await self._edit(
                    chat_id,
                    message_id,
                    escape(self._t(chat_id, "operator_prompt")),
                    self._keyboard([[self._button(self._t(chat_id, "button_back"), "support_main")]]),
                )
            return

        if not self._is_admin(callback):
            return

        if action == "main":
            await self._show_main(chat_id, message_id)
        elif action == "users":
            await self._show_users(chat_id, message_id, page=int(payload.get("page", 0)), query=str(payload.get("query") or ""))
        elif action == "user":
            await self._show_user(chat_id, message_id, payload["user_id"])
        elif action == "username_start":
            self.waiting[admin_id] = {"action": "set_username", "user_id": payload["user_id"]}
            await self._edit(chat_id, message_id, "Отправь новый ник одним сообщением. /cancel для отмены.")
        elif action == "achievements":
            await self._show_achievements(chat_id, message_id, payload["user_id"], int(payload.get("page", 0)))
        elif action == "toggle_achievement":
            unlocked = toggle_admin_achievement(self.db_path, payload["user_id"], payload["code"])
            await self._answer_callback(callback_id, "Выдано" if unlocked else "Убрано")
            await self._show_achievements(chat_id, message_id, payload["user_id"], int(payload.get("page", 0)))
        elif action == "periods":
            await self._show_periods(chat_id, message_id, payload["user_id"])
        elif action == "period":
            await self._show_period(chat_id, message_id, payload["user_id"], payload["period_code"])
        elif action == "period_unlock":
            set_admin_period_unlocked(self.db_path, payload["user_id"], payload["period_code"], True)
            await self._show_period(chat_id, message_id, payload["user_id"], payload["period_code"])
        elif action == "period_lock_reset":
            set_admin_period_unlocked(self.db_path, payload["user_id"], payload["period_code"], False)
            await self._show_period(chat_id, message_id, payload["user_id"], payload["period_code"])
        elif action == "city":
            await self._show_city(chat_id, message_id, payload["user_id"], payload["period_code"], payload["city"])
        elif action == "city_pass":
            set_admin_city_score(self.db_path, payload["user_id"], payload["period_code"], payload["city"], 100)
            await self._show_city(chat_id, message_id, payload["user_id"], payload["period_code"], payload["city"])
        elif action == "city_reset":
            reset_admin_city_progress(self.db_path, payload["user_id"], payload["period_code"], payload["city"])
            await self._show_city(chat_id, message_id, payload["user_id"], payload["period_code"], payload["city"])
        elif action == "city_score_start":
            self.waiting[admin_id] = {
                "action": "set_city_score",
                "user_id": payload["user_id"],
                "period_code": payload["period_code"],
                "city": payload["city"],
            }
            await self._edit(chat_id, message_id, "Отправь балл от 0 до 100. /cancel для отмены.")
        elif action == "delete_confirm":
            user = get_admin_user(self.db_path, payload["user_id"])
            if not user:
                await self._edit(chat_id, message_id, "Пользователь не найден.")
                return
            await self._edit(
                chat_id,
                message_id,
                f"Удалить аккаунт <b>{escape(user['username'])}</b>?\nЭто удалит профиль, прогресс, тесты и ачивки.",
                self._keyboard(
                    [
                        [self._button("Да, удалить навсегда", "delete_do", user_id=payload["user_id"])],
                        [self._button("Отмена", "user", user_id=payload["user_id"])],
                    ]
                ),
            )
        elif action == "delete_do":
            deleted = delete_admin_user(self.db_path, payload["user_id"])
            await self._edit(
                chat_id,
                message_id,
                "Аккаунт удалён." if deleted else "Пользователь уже не найден.",
                self._keyboard([[self._button("⬅️ Пользователи", "users", page=0)]]),
            )
        elif action == "site_toggle":
            set_site_disabled(self.db_path, bool(payload["disabled"]))
            await self._show_main(chat_id, message_id)

    async def _handle_update(self, update: dict[str, Any]) -> None:
        if "message" in update:
            await self._handle_message(update["message"])
        elif "callback_query" in update:
            await self._handle_callback(update["callback_query"])

    async def run(self) -> None:
        self.logger.info("Telegram admin bot started.")
        async with httpx.AsyncClient(timeout=45) as client:
            while not self.stop_event.is_set():
                try:
                    response = await client.post(
                        f"{self.api_base}/getUpdates",
                        json={
                            "offset": self.offset,
                            "timeout": 30,
                            "allowed_updates": ["message", "callback_query"],
                        },
                    )
                    response.raise_for_status()
                    payload = response.json()
                    for update in payload.get("result", []):
                        self.offset = max(self.offset, int(update["update_id"]) + 1)
                        try:
                            await self._handle_update(update)
                        except Exception:
                            self.logger.exception("Telegram admin update failed.")
                except asyncio.CancelledError:
                    raise
                except Exception:
                    self.logger.exception("Telegram admin polling failed.")
                    await asyncio.sleep(5)


def start_telegram_admin_bot(
    *,
    db_path: str | Path,
    logger: logging.Logger,
) -> TelegramAdminRuntime | None:
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    admin_ids = _parse_admin_ids(os.getenv("TELEGRAM_ADMIN_IDS", ""))
    if not token:
        return None
    if not admin_ids:
        logger.warning("TELEGRAM_BOT_TOKEN is set, but TELEGRAM_ADMIN_IDS is empty. Bot is disabled.")
        return None

    stop_event = asyncio.Event()
    bot = TelegramAdminBot(
        db_path=db_path,
        token=token,
        admin_ids=admin_ids,
        stop_event=stop_event,
        logger=logger,
    )
    return TelegramAdminRuntime(
        task=asyncio.create_task(bot.run(), name="telegram-admin-bot"),
        stop_event=stop_event,
    )

