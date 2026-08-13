#!/usr/bin/env python3
"""
AI Book Editor - terminal prototype.

Tests the core architecture before building any UI:
  Master Prompt + Story Memory + relevant retrieved fragments + recent
  conversation, with a full raw archive kept in storage (nothing lost).

Storage is already namespaced by book_id (books/<book_id>/...), the same
way user_id/book_id would key rows in a real multi-tenant database later.
The UI stays single-tenant-simple (one perfect book space per person);
only the storage layout is built multi-tenant-ready from day one.

Usage:
    export ANTHROPIC_API_KEY=sk-...
    python3 editor.py --book ayman

Commands inside the chat:
    /memory   - dump current Story Memory as JSON
    /archive  - show how many raw turns are stored
    /quit     - exit (everything is already saved incrementally)
"""

import argparse
import json
import math
import os
import re
import sys
from collections import Counter
from pathlib import Path

import anthropic

MODEL = "claude-opus-5"  # swap to "claude-sonnet-5" for a cheaper/faster run
RECENT_WINDOW = 3        # how many prior turns (user+assistant pairs) to show verbatim
RETRIEVAL_TOP_K = 4      # how many older fragments to pull in by relevance

HERE = Path(__file__).parent
BOOKS_DIR = HERE / "books"
MASTER_PROMPT_PATH = HERE / "master_prompt.md"
SCHEMA_PATH = HERE / "story_memory_schema.json"

DEFAULT_CONFIG = {
    "user_id": None,
    "name": "",
    "book_title": None,
    "title_candidates": [],
    "cover_image": None,
    "theme": "default",
}

STOPWORDS = {
    "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be",
    "been", "to", "of", "in", "on", "at", "for", "with", "that", "this",
    "it", "i", "you", "he", "she", "they", "we", "my", "your", "his",
    "her", "their", "our", "me", "him", "them", "us", "as", "if", "so",
    "not", "do", "did", "does", "have", "has", "had", "will", "would",
    "could", "should", "can", "just", "about", "into", "than", "then",
    "there", "what", "when", "where", "who", "how", "why", "which",
}

RECORD_MEMORY_TOOL = {
    "name": "record_memory_update",
    "description": (
        "Record ONLY what is new or changed this turn in the Story Memory. "
        "Omit any field with nothing new. Never invent entries not grounded "
        "in what the user actually said."
    ),
    "input_schema": {
        "type": "object",
        "properties": {
            "people": {"type": "array", "items": {"type": "object", "properties": {
                "name": {"type": "string"}, "role": {"type": "string"},
                "notes": {"type": "string"}}}},
            "relationships": {"type": "array", "items": {"type": "object", "properties": {
                "between": {"type": "array", "items": {"type": "string"}},
                "description": {"type": "string"}}}},
            "timeline": {"type": "array", "items": {"type": "object", "properties": {
                "period": {"type": "string"}, "event": {"type": "string"},
                "significance": {"type": "string"}}}},
            "places": {"type": "array", "items": {"type": "object", "properties": {
                "name": {"type": "string"}, "context": {"type": "string"}}}},
            "themes": {"type": "array", "items": {"type": "object", "properties": {
                "theme": {"type": "string"}, "evidence": {"type": "string"}}}},
            "recurring_images": {"type": "array", "items": {"type": "string"}},
            "key_events": {"type": "array", "items": {"type": "string"}},
            "contradictions": {"type": "array", "items": {"type": "object", "properties": {
                "description": {"type": "string"}, "related_to": {"type": "string"}}}},
            "emotional_turning_points": {"type": "array", "items": {"type": "string"}},
            "open_threads_new": {"type": "array", "items": {"type": "object", "properties": {
                "topic": {"type": "string"}, "note": {"type": "string"}}}},
            "open_threads_resolved": {"type": "array", "items": {"type": "string"},
                "description": "Topic strings of previously open threads that are now resolved."},
            "possible_scenes": {"type": "array", "items": {"type": "string"}},
            "possible_chapters": {"type": "array", "items": {"type": "object", "properties": {
                "title": {"type": "string"}, "stories": {"type": "array", "items": {"type": "string"}}}}},
            "unresolved_questions": {"type": "array", "items": {"type": "string"}},
            "important_quotes": {"type": "array", "items": {"type": "object", "properties": {
                "text": {"type": "string"}, "context": {"type": "string"}}}},
            "facts_needing_confirmation": {"type": "array", "items": {"type": "string"}},
            "editorial_insights": {"type": "array", "items": {"type": "string"}},
            "author_voice": {"type": "object", "properties": {
                "tone": {"type": "string"}, "rhythm": {"type": "string"},
                "recurring_phrases": {"type": "array", "items": {"type": "string"}},
                "style_notes": {"type": "array", "items": {"type": "string"}}}},
            "structure_hypotheses": {"type": "array", "items": {"type": "object", "properties": {
                "type": {"type": "string"}, "confidence": {"type": "number"},
                "reason": {"type": "string"}}}},
            "book_title_suggestion": {"type": "string",
                "description": "Only set once there is enough material to genuinely propose a title."},
        },
    },
}


def load_json(path, default):
    if path.exists():
        return json.loads(path.read_text())
    return default


def load_archive(archive_path):
    if not archive_path.exists():
        return []
    turns = []
    with archive_path.open() as f:
        for line in f:
            line = line.strip()
            if line:
                turns.append(json.loads(line))
    return turns


def append_archive(archive_path, entry):
    with archive_path.open("a") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")


def save_memory(memory_path, memory):
    memory_path.write_text(json.dumps(memory, ensure_ascii=False, indent=2))


def save_config(config_path, config):
    config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2))


def tokenize(text):
    words = re.findall(r"[a-zA-Ząćęłńóśźż]+", text.lower())
    return [w for w in words if w not in STOPWORDS and len(w) > 2]


def retrieve_relevant(archive, current_text, exclude_turns, top_k):
    """Pure-python TF/IDF-ish relevance scoring over past user turns. No deps."""
    candidates = [t for t in archive if t["role"] == "user" and t["turn"] not in exclude_turns]
    if not candidates:
        return []

    doc_freq = Counter()
    doc_tokens = {}
    for t in candidates:
        toks = set(tokenize(t["text"]))
        doc_tokens[t["turn"]] = toks
        for w in toks:
            doc_freq[w] += 1

    query_toks = set(tokenize(current_text))
    n_docs = len(candidates)

    scored = []
    for t in candidates:
        toks = doc_tokens[t["turn"]]
        overlap = query_toks & toks
        if not overlap:
            continue
        score = sum(math.log((n_docs + 1) / (doc_freq[w] + 1)) + 1 for w in overlap)
        scored.append((score, t))

    scored.sort(key=lambda x: x[0], reverse=True)
    return [t for _, t in scored[:top_k]]


def merge_memory(memory, update):
    list_fields = [
        "people", "relationships", "timeline", "places", "themes",
        "recurring_images", "key_events", "contradictions",
        "emotional_turning_points", "possible_scenes", "possible_chapters",
        "unresolved_questions", "important_quotes",
        "facts_needing_confirmation", "editorial_insights",
    ]
    for field in list_fields:
        if update.get(field):
            memory.setdefault(field, []).extend(update[field])

    if update.get("open_threads_new"):
        for item in update["open_threads_new"]:
            memory.setdefault("open_threads", []).append({
                "topic": item.get("topic", ""),
                "note": item.get("note", ""),
                "resolved": False,
            })

    if update.get("open_threads_resolved"):
        for topic in update["open_threads_resolved"]:
            for thread in memory.get("open_threads", []):
                if thread["topic"].strip().lower() == topic.strip().lower():
                    thread["resolved"] = True

    if update.get("author_voice"):
        av = memory.setdefault("author_voice", {"tone": "", "rhythm": "", "recurring_phrases": [], "style_notes": []})
        incoming = update["author_voice"]
        if incoming.get("tone"):
            av["tone"] = incoming["tone"]
        if incoming.get("rhythm"):
            av["rhythm"] = incoming["rhythm"]
        for phrase in incoming.get("recurring_phrases", []):
            if phrase not in av["recurring_phrases"]:
                av["recurring_phrases"].append(phrase)
        for note in incoming.get("style_notes", []):
            if note not in av["style_notes"]:
                av["style_notes"].append(note)

    if update.get("structure_hypotheses"):
        existing = {h["type"]: h for h in memory.get("structure_hypotheses", [])}
        for h in update["structure_hypotheses"]:
            existing[h.get("type", "")] = h
        memory["structure_hypotheses"] = list(existing.values())

    return memory


def build_context_block(memory, retrieved, recent_turns, latest_message):
    lines = ["[CONTEXT - reference material, not part of what the user is saying]", ""]
    lines.append("STORY MEMORY:")
    lines.append(json.dumps(memory, ensure_ascii=False, indent=2))
    lines.append("")

    if retrieved:
        lines.append("RELEVANT PAST FRAGMENTS (verbatim, ground truth):")
        for t in retrieved:
            lines.append(f'- (turn {t["turn"]}, user): "{t["text"]}"')
        lines.append("")

    if recent_turns:
        lines.append("RECENT CONVERSATION:")
        for t in recent_turns:
            speaker = "user" if t["role"] == "user" else "editor"
            lines.append(f'{speaker} (turn {t["turn"]}): {t["text"]}')
        lines.append("")

    lines.append("[END CONTEXT]")
    lines.append("")
    lines.append("USER'S LATEST MESSAGE:")
    lines.append(latest_message)
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--book", default="ayman", help="book_id — each person/book gets its own space under books/<id>/")
    parser.add_argument("--name", default=None, help="display name to set on first run for a new book_id")
    args = parser.parse_args()

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print("ANTHROPIC_API_KEY is not set. Run:\n  export ANTHROPIC_API_KEY=sk-...\nthen try again.")
        sys.exit(1)

    book_id = args.book
    book_dir = BOOKS_DIR / book_id
    session_dir = book_dir / "session"
    session_dir.mkdir(parents=True, exist_ok=True)
    archive_path = session_dir / "raw_archive.jsonl"
    memory_path = session_dir / "story_memory.json"
    config_path = book_dir / "config.json"

    config = load_json(config_path, dict(DEFAULT_CONFIG))
    if args.name and not config.get("name"):
        config["name"] = args.name
    if not config.get("user_id"):
        config["user_id"] = book_id
    if not config.get("name"):
        config["name"] = book_id.capitalize()
    save_config(config_path, config)

    client = anthropic.Anthropic(api_key=api_key)
    master_prompt = MASTER_PROMPT_PATH.read_text()
    system_prompt = master_prompt + (
        "\n\nAfter your reply text, always call record_memory_update with anything "
        "new learned this turn. If truly nothing is new, call it with an empty object."
    )

    archive = load_archive(archive_path)
    memory = load_json(memory_path, load_json(SCHEMA_PATH, {}))
    turn = (archive[-1]["turn"] + 1) if archive else 1

    title_line = f'"{config["book_title"]}"' if config.get("book_title") else "(no title yet)"
    print(f"Welcome, {config['name']} — {title_line}")
    print(f"book space: books/{book_id}/  |  /memory /archive /quit\n")

    while True:
        try:
            user_text = input("you> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break

        if not user_text:
            continue
        if user_text == "/quit":
            break
        if user_text == "/memory":
            print(json.dumps(memory, ensure_ascii=False, indent=2))
            continue
        if user_text == "/archive":
            print(f"{len(archive)} raw turns stored in {archive_path}")
            continue

        user_entry = {"turn": turn, "role": "user", "text": user_text}
        archive.append(user_entry)
        append_archive(archive_path, user_entry)

        recent_turns = archive[-(RECENT_WINDOW * 2 + 1):-1]
        exclude_turn_numbers = {t["turn"] for t in recent_turns} | {turn}
        retrieved = retrieve_relevant(archive, user_text, exclude_turn_numbers, RETRIEVAL_TOP_K)

        context_block = build_context_block(memory, retrieved, recent_turns, user_text)

        response = client.messages.create(
            model=MODEL,
            max_tokens=2000,
            system=system_prompt,
            tools=[RECORD_MEMORY_TOOL],
            messages=[{"role": "user", "content": context_block}],
        )

        reply_text = ""
        memory_update = None
        for block in response.content:
            if block.type == "text":
                reply_text += block.text
            elif block.type == "tool_use" and block.name == "record_memory_update":
                memory_update = block.input

        print(f"\neditor> {reply_text}\n")

        assistant_entry = {"turn": turn, "role": "assistant", "text": reply_text}
        archive.append(assistant_entry)
        append_archive(archive_path, assistant_entry)

        if memory_update:
            title_suggestion = memory_update.pop("book_title_suggestion", None)
            memory = merge_memory(memory, memory_update)
            save_memory(memory_path, memory)

            if title_suggestion and title_suggestion != config.get("book_title"):
                if title_suggestion not in config["title_candidates"]:
                    config["title_candidates"].append(title_suggestion)
                config["book_title"] = title_suggestion
                save_config(config_path, config)
                print(f'📖 The Editor named your book: "{title_suggestion}"\n')

        turn += 1


if __name__ == "__main__":
    main()
