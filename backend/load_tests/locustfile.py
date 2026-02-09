"""
巴商会 社内AI FAQ - 負荷テスト (Locust)

実行方法:
  # Web UI付き
  locust -f backend/load_tests/locustfile.py --host http://localhost:8300

  # ヘッドレス（50ユーザー例）
  locust -f backend/load_tests/locustfile.py --host http://localhost:8300 \
    --headless -u 50 -r 10 --run-time 60s

  # 段階テスト（1,050ユーザー目標）
  locust -f backend/load_tests/locustfile.py --host http://localhost:8300 \
    --headless -u 1050 -r 50 --run-time 300s

成功基準:
  - P95応答時間: 3秒以内（チャット除く）
  - エラー率: 1%以下
  - DB接続エラー: 0件
"""

import json

from locust import HttpUser, between, task


class FAQUser(HttpUser):
    """社内FAQシステム利用者をシミュレート"""

    wait_time = between(1, 3)

    def on_start(self):
        """ログインしてJWTトークンを取得"""
        resp = self.client.post(
            "/api/auth/login",
            json={"email": "admin@example.com", "password": "admin123"},
        )
        if resp.status_code == 200:
            token = resp.json().get("access_token", "")
            self.client.headers.update({"Authorization": f"Bearer {token}"})
        else:
            self.client.headers.update({})

    @task(5)
    def chat_question(self):
        """チャット質問送信（最頻出）"""
        self.client.post(
            "/api/chat",
            json={
                "question": "有給休暇の申請方法を教えてください",
                "mode": "standard",
            },
            timeout=30,
            name="/api/chat",
        )

    @task(2)
    def view_stats(self):
        """統計ダッシュボード閲覧"""
        self.client.get("/api/stats/overview?days=30", name="/api/stats/overview")
        self.client.get("/api/stats/daily-counts?days=14", name="/api/stats/daily-counts")

    @task(1)
    def list_documents(self):
        """ドキュメント一覧取得"""
        self.client.get("/api/documents", name="/api/documents")
