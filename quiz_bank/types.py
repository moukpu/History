from dataclasses import asdict, dataclass
from typing import Any

from .constants import DEFAULT_PERIOD_CODE


@dataclass(frozen=True)
class QuizDraft:
    city: str
    question: str
    correct_answer: str
    options: list[str]
    fact: str
    period_code: str = DEFAULT_PERIOD_CODE
    difficulty: str = "easy"

    def to_record(self) -> dict[str, Any]:
        correct_index = self.options.index(self.correct_answer)
        return {
            "city": self.city,
            "period_code": self.period_code,
            "difficulty": self.difficulty,
            "question": self.question,
            "options": self.options,
            "correct_index": correct_index,
            "fact": self.fact,
        }


@dataclass(frozen=True)
class ValidationIssue:
    level: str
    city: str
    question: str
    message: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)


@dataclass(frozen=True)
class ContentValidationIssue:
    level: str
    city: str
    period_code: str
    field: str
    message: str

    def to_dict(self) -> dict[str, str]:
        return asdict(self)
