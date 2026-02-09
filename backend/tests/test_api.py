"""API Tests for Tomoe Shokai FAQ System"""
import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


class TestHealthCheck:
    """Health check endpoint tests"""

    def test_health_check(self):
        """Test health check returns OK"""
        response = client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert "version" in data


class TestDocumentsAPI:
    """Documents API tests"""

    def test_list_documents(self):
        """Test listing documents"""
        response = client.get("/api/documents")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    def test_get_document_not_found(self):
        """Test getting non-existent document returns 404"""
        response = client.get("/api/documents/non-existent-id")
        assert response.status_code == 404

    def test_delete_document_requires_auth(self):
        """Test deleting document requires admin auth"""
        response = client.delete("/api/documents/non-existent-id")
        assert response.status_code == 401


class TestChatAPI:
    """Chat API tests"""

    def test_chat_empty_question(self):
        """Test chat with empty question returns 400"""
        response = client.post("/api/chat", json={"question": ""})
        assert response.status_code == 400

    def test_chat_whitespace_only(self):
        """Test chat with whitespace only returns 400"""
        response = client.post("/api/chat", json={"question": "   "})
        assert response.status_code == 400


class TestFeedbackAPI:
    """Feedback API tests"""

    def test_feedback_chat_not_found(self):
        """Test feedback for non-existent chat returns 404"""
        response = client.post("/api/feedback", json={
            "chat_id": "non-existent-id",
            "feedback": "good"
        })
        assert response.status_code == 404

    def test_feedback_invalid_value(self):
        """Test feedback with invalid value returns 400"""
        # First we need a valid chat_id, but since we don't have one,
        # this test checks the validation logic
        response = client.post("/api/feedback", json={
            "chat_id": "some-id",
            "feedback": "invalid"
        })
        # Either 404 (chat not found) or 400 (invalid feedback)
        assert response.status_code in [400, 404]


class TestStatsAPI:
    """Stats API tests"""

    def test_stats_overview(self):
        """Test stats overview returns correct structure"""
        response = client.get("/api/stats/overview")
        assert response.status_code == 200
        data = response.json()
        assert "total_questions" in data
        assert "good_feedback" in data
        assert "bad_feedback" in data
        assert "positive_rate" in data
        assert "no_answer_count" in data
        assert "avg_similarity" in data
        assert "document_count" in data

    def test_stats_overview_with_days(self):
        """Test stats overview with custom days parameter"""
        response = client.get("/api/stats/overview?days=7")
        assert response.status_code == 200
        data = response.json()
        assert data["period_days"] == 7

    def test_chat_history(self):
        """Test chat history returns correct structure"""
        response = client.get("/api/stats/chat-history")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "items" in data
        assert isinstance(data["items"], list)

    def test_chat_history_with_filter(self):
        """Test chat history with feedback filter"""
        response = client.get("/api/stats/chat-history?feedback=good")
        assert response.status_code == 200

    def test_missing_topics(self):
        """Test missing topics returns correct structure"""
        response = client.get("/api/stats/missing-topics")
        assert response.status_code == 200
        data = response.json()
        assert "total_no_answer" in data
        assert "frequent_keywords" in data
        assert "recent_questions" in data

    def test_daily_counts(self):
        """Test daily counts returns correct structure"""
        response = client.get("/api/stats/daily-counts")
        assert response.status_code == 200
        data = response.json()
        assert "period_days" in data
        assert "data" in data
        assert isinstance(data["data"], list)
