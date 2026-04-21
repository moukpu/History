from __future__ import annotations

import random
import re
from typing import Mapping, Sequence

from .constants import SUPPORTED_CITIES, TIMELINE_PERIODS_BY_CODE
from .types import QuizDraft
from .validation import normalize_text

HARD_CLUE_GROUPS: tuple[tuple[int, ...], ...] = (
    (0, 4),
    (1, 6),
    (2, 8),
    (3, 9),
    (5, 10),
    (7, 12),
    (11, 14),
    (13, 16, 17),
    (15, 18, 19),
    (0, 5, 11),
)

HARD_TARGET_INDEXES: tuple[int, ...] = (3, 4, 5, 6, 7, 8, 9, 10, 11, 12)

QUESTION_TEMPLATES: tuple[str, ...] = (
    "Какой вывод о роли города периода {year_label} лучше всего подтверждают факты: {clues}?",
    "Какое утверждение точнее всего описывает этот город периода {year_label}, если верны такие признаки: {clues}?",
    "Какое объяснение значения города периода {year_label} лучше всего следует из фактов: {clues}?",
    "Какой вариант верно обобщает сведения о городе периода {year_label}: {clues}?",
    "Какой ответ лучше всего раскрывает значение этого города периода {year_label}, если учесть: {clues}?",
    "Какое описание наиболее точно соответствует городу периода {year_label} по совокупности фактов: {clues}?",
    "Какое утверждение о городе периода {year_label} подтверждается приведёнными признаками: {clues}?",
    "Какой вывод о месте города в эпохе {year_label} будет наиболее точным, если помнить: {clues}?",
    "Какой ответ лучше всего передаёт исторический профиль города периода {year_label}: {clues}?",
    "Какое объяснение роли города периода {year_label} логично следует из набора фактов: {clues}?",
)


def _sanitize_fact(city: str, fact: str) -> str:
  text = fact.strip()
  replacements = {
      city: "этот город",
      city.casefold(): "этот город",
  }
  for source, target in replacements.items():
      text = re.sub(re.escape(source), target, text, flags=re.IGNORECASE)
  text = re.sub(r"\s+", " ", text).strip()
  return text.rstrip(".")


def _build_clue_text(city: str, facts: Sequence[str]) -> str:
  parts = [
      f"{index}. {_sanitize_fact(city, fact)}"
      for index, fact in enumerate(facts, start=1)
  ]
  return "; ".join(parts)


def _get_correct_answer(record: Mapping[str, object]) -> str:
  options = [str(item) for item in record["options"]]
  correct_index = int(record["correct_index"])
  return options[correct_index]


def _is_city_name(value: str) -> bool:
  normalized = normalize_text(value)
  return any(normalized == normalize_text(city) for city in SUPPORTED_CITIES)


def _build_options(
  question: str,
  correct_answer: str,
  city: str,
  target_index: int,
  peer_easy_records_by_city: Mapping[str, Sequence[Mapping[str, object]]],
) -> list[str]:
  normalized_correct = normalize_text(correct_answer)
  candidates: list[str] = []
  seen: set[str] = set()

  for peer_city, peer_records in peer_easy_records_by_city.items():
      if peer_city == city or target_index >= len(peer_records):
          continue
      candidate = _get_correct_answer(peer_records[target_index])
      normalized_candidate = normalize_text(candidate)
      if (
          not candidate.strip()
          or normalized_candidate == normalized_correct
          or normalized_candidate in seen
          or _is_city_name(candidate)
      ):
          continue
      seen.add(normalized_candidate)
      candidates.append(candidate)

  if len(candidates) < 3:
      for peer_city, peer_records in peer_easy_records_by_city.items():
          if peer_city == city:
              continue
          for peer_record in peer_records:
              candidate = _get_correct_answer(peer_record)
              normalized_candidate = normalize_text(candidate)
              if (
                  not candidate.strip()
                  or normalized_candidate == normalized_correct
                  or normalized_candidate in seen
                  or _is_city_name(candidate)
              ):
                  continue
              seen.add(normalized_candidate)
              candidates.append(candidate)
              if len(candidates) >= 3:
                  break
          if len(candidates) >= 3:
              break

  if len(candidates) < 3:
      raise ValueError(
          f"Not enough distractor facts for hard question: {city} / {question}"
      )

  randomizer = random.Random(f"{question}|{city}|{target_index}")
  distractors = randomizer.sample(candidates, 3)
  options = [correct_answer, *distractors]
  randomizer.shuffle(options)
  return options


def build_hard_quiz_records(
  city: str,
  period_code: str,
  easy_records: Sequence[Mapping[str, object]],
  peer_easy_records_by_city: Mapping[str, Sequence[Mapping[str, object]]],
  hard_question_count: int = 10,
) -> list[dict[str, object]]:
  if len(easy_records) < 20:
      raise ValueError(
          f"Hard generation expects at least 20 easy records for {city}/{period_code}, "
          f"found {len(easy_records)}."
      )
  if hard_question_count > len(HARD_CLUE_GROUPS):
      raise ValueError("Requested hard question count exceeds configured clue groups.")

  year_label = TIMELINE_PERIODS_BY_CODE[period_code]["year_label"]
  records: list[dict[str, object]] = []

  for index in range(hard_question_count):
      clue_indexes = HARD_CLUE_GROUPS[index]
      target_index = HARD_TARGET_INDEXES[index]
      target_record = easy_records[target_index]
      correct_answer = _get_correct_answer(target_record)
      if _is_city_name(correct_answer):
          raise ValueError(
              f"Hard generation target still resolves to city name for {city}/{period_code}."
          )

      clue_facts = [str(easy_records[item_index]["fact"]) for item_index in clue_indexes]
      clue_text = _build_clue_text(city, clue_facts)
      question = QUESTION_TEMPLATES[index].format(
          year_label=year_label,
          clues=clue_text,
      )
      explanation = (
          f"Верный вывод: {correct_answer}. "
          + " ".join(fact.strip().rstrip(".") + "." for fact in clue_facts)
      ).strip()
      draft = QuizDraft(
          city=city,
          period_code=period_code,
          difficulty="hard",
          question=question,
          correct_answer=correct_answer,
          options=_build_options(
              question=question,
              correct_answer=correct_answer,
              city=city,
              target_index=target_index,
              peer_easy_records_by_city=peer_easy_records_by_city,
          ),
          fact=explanation,
      )
      records.append(draft.to_record())

  return records
