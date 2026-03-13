#!/usr/bin/env python3
"""
Commentzor API Server
Flask-based API serving comment data to the frontend.
"""

import os
import sys
import json
import random
from flask import Flask, jsonify, send_from_directory, request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from db import get_connection, init_db, get_stats, DB_PATH

app = Flask(__name__, static_folder=os.path.join(os.path.dirname(__file__), "..", "web"))

# ─── API Routes ──────────────────────────────────────────────────────

@app.route("/api/stats")
def api_stats():
    """Overall database statistics."""
    stats = get_stats()
    conn = get_connection()

    # Channel stats
    channels = conn.execute("""
        SELECT c.*,
            (SELECT COUNT(*) FROM videos WHERE videos.channel_id=c.channel_id) as vid_count,
            (SELECT COUNT(*) FROM comments WHERE comments.channel_id=c.channel_id) as cmt_count
        FROM channels c ORDER BY cmt_count DESC
    """).fetchall()

    stats["channels"] = [dict(ch) for ch in channels]

    # Top commenters
    top_authors = conn.execute("""
        SELECT author_name, author_id, author_avatar, total_comments
        FROM authors ORDER BY total_comments DESC LIMIT 25
    """).fetchall()
    stats["top_authors"] = [dict(a) for a in top_authors]

    # Most commented videos
    top_videos = conn.execute("""
        SELECT v.video_id, v.title, v.channel_id, c.channel_name,
            (SELECT COUNT(*) FROM comments WHERE comments.video_id=v.video_id) as actual_comments,
            v.view_count, v.like_count, v.thumbnail_url
        FROM videos v JOIN channels c ON v.channel_id=c.channel_id
        ORDER BY actual_comments DESC LIMIT 20
    """).fetchall()
    stats["top_videos"] = [dict(v) for v in top_videos]

    # Most liked comments
    top_liked = conn.execute("""
        SELECT cm.text_original, cm.like_count, cm.published_at,
            a.author_name, v.title as video_title, v.video_id
        FROM comments cm
        JOIN authors a ON cm.author_id=a.author_id
        JOIN videos v ON cm.video_id=v.video_id
        ORDER BY cm.like_count DESC LIMIT 20
    """).fetchall()
    stats["top_liked_comments"] = [dict(c) for c in top_liked]

    # Comments over time (by month)
    timeline = conn.execute("""
        SELECT strftime('%Y-%m', published_at) as month, COUNT(*) as count
        FROM comments WHERE published_at IS NOT NULL AND published_at != ''
        GROUP BY month ORDER BY month
    """).fetchall()
    stats["timeline"] = [dict(t) for t in timeline]

    # Comments by day of week
    by_day = conn.execute("""
        SELECT CASE cast(strftime('%w', published_at) as integer)
            WHEN 0 THEN 'Sunday' WHEN 1 THEN 'Monday' WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday' WHEN 4 THEN 'Thursday' WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday' END as day_name,
            COUNT(*) as count
        FROM comments WHERE published_at IS NOT NULL AND published_at != ''
        GROUP BY day_name ORDER BY cast(strftime('%w', published_at) as integer)
    """).fetchall()
    stats["by_day_of_week"] = [dict(d) for d in by_day]

    # Average comment length
    avg_len = conn.execute("""
        SELECT AVG(LENGTH(text_original)) as avg_length,
               MAX(LENGTH(text_original)) as max_length,
               MIN(LENGTH(text_original)) as min_length
        FROM comments
    """).fetchone()
    stats["avg_comment_length"] = dict(avg_len) if avg_len else {}

    conn.close()
    return jsonify(stats)


@app.route("/api/channels")
def api_channels():
    """List all channels."""
    conn = get_connection()
    channels = conn.execute("""
        SELECT c.*,
            (SELECT COUNT(*) FROM videos WHERE videos.channel_id=c.channel_id) as vid_count,
            (SELECT COUNT(*) FROM comments WHERE comments.channel_id=c.channel_id) as cmt_count
        FROM channels c ORDER BY c.channel_name
    """).fetchall()
    conn.close()
    return jsonify([dict(ch) for ch in channels])


@app.route("/api/channels/<channel_id>/random")
def api_random_comments(channel_id):
    """Get random comments for display grid. Returns 81 (9x9) by default."""
    count = request.args.get("count", 81, type=int)
    conn = get_connection()

    # Get total comments for this channel
    total = conn.execute(
        "SELECT COUNT(*) FROM comments WHERE channel_id=?", (channel_id,)
    ).fetchone()[0]

    if total == 0:
        conn.close()
        return jsonify([])

    # Use random offset selection for large datasets
    comments = conn.execute("""
        SELECT cm.comment_id, cm.text_original, cm.like_count, cm.published_at, cm.is_reply,
            a.author_name, a.author_avatar,
            v.title as video_title, v.video_id
        FROM comments cm
        JOIN authors a ON cm.author_id=a.author_id
        JOIN videos v ON cm.video_id=v.video_id
        WHERE cm.channel_id=?
        ORDER BY RANDOM()
        LIMIT ?
    """, (channel_id, count)).fetchall()

    conn.close()
    return jsonify([dict(c) for c in comments])


@app.route("/api/channels/<channel_id>/videos")
def api_channel_videos(channel_id):
    """List videos for a channel with comment counts."""
    sort = request.args.get("sort", "comments")
    order_clause = {
        "comments": "actual_comments DESC",
        "views": "v.view_count DESC",
        "recent": "v.published_at DESC",
        "likes": "v.like_count DESC",
    }.get(sort, "actual_comments DESC")

    conn = get_connection()
    videos = conn.execute(f"""
        SELECT v.*,
            (SELECT COUNT(*) FROM comments WHERE comments.video_id=v.video_id) as actual_comments
        FROM videos v WHERE v.channel_id=?
        ORDER BY {order_clause} LIMIT 100
    """, (channel_id,)).fetchall()
    conn.close()
    return jsonify([dict(v) for v in videos])


@app.route("/api/videos/<video_id>/comments")
def api_video_comments(video_id):
    """Get comments for a specific video."""
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 50, type=int)
    offset = (page - 1) * per_page

    conn = get_connection()
    comments = conn.execute("""
        SELECT cm.*, a.author_name, a.author_avatar
        FROM comments cm
        JOIN authors a ON cm.author_id=a.author_id
        WHERE cm.video_id=? AND cm.is_reply=0
        ORDER BY cm.like_count DESC
        LIMIT ? OFFSET ?
    """, (video_id, per_page, offset)).fetchall()

    total = conn.execute(
        "SELECT COUNT(*) FROM comments WHERE video_id=? AND is_reply=0", (video_id,)
    ).fetchone()[0]

    conn.close()
    return jsonify({
        "comments": [dict(c) for c in comments],
        "total": total,
        "page": page,
        "per_page": per_page,
    })


@app.route("/api/search")
def api_search():
    """Search comments by text."""
    q = request.args.get("q", "")
    if not q or len(q) < 2:
        return jsonify([])

    conn = get_connection()
    results = conn.execute("""
        SELECT cm.text_original, cm.like_count, cm.published_at,
            a.author_name, v.title as video_title, v.video_id, c.channel_name
        FROM comments cm
        JOIN authors a ON cm.author_id=a.author_id
        JOIN videos v ON cm.video_id=v.video_id
        JOIN channels c ON cm.channel_id=c.channel_id
        WHERE cm.text_original LIKE ?
        ORDER BY cm.like_count DESC
        LIMIT 100
    """, (f"%{q}%",)).fetchall()

    conn.close()
    return jsonify([dict(r) for r in results])


@app.route("/api/authors/<author_id>")
def api_author(author_id):
    """Get author details and their comments."""
    conn = get_connection()
    author = conn.execute("SELECT * FROM authors WHERE author_id=?", (author_id,)).fetchone()
    if not author:
        conn.close()
        return jsonify({"error": "Author not found"}), 404

    comments = conn.execute("""
        SELECT cm.text_original, cm.like_count, cm.published_at,
            v.title as video_title, v.video_id, c.channel_name
        FROM comments cm
        JOIN videos v ON cm.video_id=v.video_id
        JOIN channels c ON cm.channel_id=c.channel_id
        WHERE cm.author_id=?
        ORDER BY cm.published_at DESC LIMIT 100
    """, (author_id,)).fetchall()

    conn.close()
    return jsonify({
        "author": dict(author),
        "comments": [dict(c) for c in comments],
    })


# ─── Static Files ────────────────────────────────────────────────────

@app.route("/")
def index():
    return send_from_directory(app.static_folder, "index.html")


@app.route("/<path:filename>")
def static_files(filename):
    return send_from_directory(app.static_folder, filename)


if __name__ == "__main__":
    init_db()
    print(f"Commentzor API Server")
    print(f"Database: {DB_PATH}")
    print(f"Web UI: http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
