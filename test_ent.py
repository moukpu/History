import urllib.request, json

body = json.dumps({"question_count": 3}).encode()
req = urllib.request.Request("http://127.0.0.1:8000/api/ent/start", data=body, headers={"Content-Type": "application/json"})
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
print(f"Session: {data['test_session_id']}")
print(f"Questions: {data['total_questions']}")
for q in data["questions"]:
    print(f"  [{q['id']}] {q['question']}")
