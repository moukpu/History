from fastapi.testclient import TestClient

import main


def test_ent_start_returns_requested_question_count() -> None:
    client = TestClient(main.app)

    response = client.post("/api/ent/start", json={"question_count": 3})

    assert response.status_code == 200
    payload = response.json()
    assert payload["total_questions"] == 3
    assert len(payload["questions"]) == 3
    assert payload["test_session_id"].startswith("ent-")
    assert all("correct_index" not in question for question in payload["questions"])
