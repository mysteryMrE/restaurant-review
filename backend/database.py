import sqlite3
import json
from datetime import datetime
from pathlib import Path

DB_PATH = Path(__file__).parent / "reviews_cache.db"


def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initialize the database with required tables."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS places (
            data_id TEXT PRIMARY KEY,
            name TEXT,
            reviews_json TEXT,
            review_count INTEGER,
            fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """
    )

    conn.commit()
    conn.close()
    print("Database initialized.")


def get_cached_reviews(data_id: str) -> dict | None:
    """Get cached reviews for a place if they exist."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute(
        "SELECT name, reviews_json, review_count, fetched_at FROM places WHERE data_id = ?",
        (data_id,),
    )
    row = cursor.fetchone()
    conn.close()

    if row:
        return {
            "name": row["name"],
            "reviews": json.loads(row["reviews_json"]),
            "review_count": row["review_count"],
            "fetched_at": row["fetched_at"],
        }
    return None


def save_reviews(data_id: str, name: str, reviews: list):
    """Save or update reviews for a place."""
    conn = get_connection()
    cursor = conn.cursor()

    reviews_json = json.dumps(reviews)

    cursor.execute(
        """
        INSERT INTO places (data_id, name, reviews_json, review_count, fetched_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(data_id) DO UPDATE SET
            name = excluded.name,
            reviews_json = excluded.reviews_json,
            review_count = excluded.review_count,
            fetched_at = excluded.fetched_at
    """,
        (data_id, name, reviews_json, len(reviews), datetime.now()),
    )

    conn.commit()
    conn.close()
    print(f"Saved {len(reviews)} reviews for '{name}' ({data_id})")


def list_cached_places() -> list:
    """List all cached places."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT data_id, name, review_count, fetched_at FROM places")
    rows = cursor.fetchall()
    conn.close()

    return [dict(row) for row in rows]


def delete_cached_place(data_id: str) -> bool:
    """Delete a cached place."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("DELETE FROM places WHERE data_id = ?", (data_id,))
    deleted = cursor.rowcount > 0

    conn.commit()
    conn.close()
    return deleted


# Initialize DB on module import
init_db()
