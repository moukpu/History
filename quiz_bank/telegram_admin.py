import asyncio
import logging
import math
import os
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
        text = str(message.get("text") or "").strip()
        if text.lower() in {"/cancel", "cancel", "отмена"}:
            self.waiting.pop(admin_id, None)
            await self._send(chat_id, "Отменено.")
            return True

        action = state.get("action")
        try:
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
        if not self._is_admin(message):
            await self._send(chat_id, "Доступ закрыт.")
            return
        if await self._handle_waiting_text(message):
            return

        text = str(message.get("text") or "").strip()
        if text.startswith("/find"):
            query = text.replace("/find", "", 1).strip()
            await self._show_users(chat_id, None, page=0, query=query)
            return
        if text.startswith("/users"):
            await self._show_users(chat_id, None, page=0)
            return
        await self._show_main(chat_id)

    async def _handle_callback(self, callback: dict[str, Any]) -> None:
        callback_id = str(callback["id"])
        message = callback.get("message") or {}
        chat_id = int(message.get("chat", {}).get("id") or 0)
        message_id = int(message.get("message_id") or 0)
        from_user = callback.get("from") or {}
        admin_id = int(from_user.get("id") or 0)

        if not self._is_admin(callback):
            await self._answer_callback(callback_id, "Доступ закрыт.")
            return

        data = str(callback.get("data") or "")
        if not data.startswith("x:"):
            await self._answer_callback(callback_id, "Кнопка устарела.")
            return
        payload = self.actions.get(data[2:])
        if not payload:
            await self._answer_callback(callback_id, "Кнопка устарела, открой меню заново.")
            return

        action = payload["action"]
        await self._answer_callback(callback_id)

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
