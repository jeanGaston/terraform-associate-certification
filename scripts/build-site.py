#!/usr/bin/env python3
"""Bundle the course Markdown into site/content.js for the training website.

Stdlib only. Run from anywhere:  python3 scripts/build-site.py
Then open site/index.html in a browser (or serve with: python3 -m http.server -d site).
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "content.js"

LAB_FILE_EXTS = {".tf", ".hcl", ".sh", ".tfvars", ".tftpl", ".md"}


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def title_of(md, fallback):
    m = re.search(r"^#\s+(.+)$", md, re.M)
    return m.group(1).strip() if m else fallback


def build_lessons():
    lessons = []
    for d in sorted((ROOT / "lessons").iterdir()):
        if not d.is_dir():
            continue
        rel = d.relative_to(ROOT).as_posix()
        md = read(f"{rel}/README.md")
        num, _, slug = d.name.partition("-")
        title = title_of(md, d.name)
        short = re.sub(r"^Lesson\s+\d+\s+[—-]\s+", "", title)
        lab_dir = d / "lab"
        files = []
        if lab_dir.is_dir():
            for f in sorted(lab_dir.rglob("*")):
                parts = f.relative_to(lab_dir).parts
                # skip learner-generated artifacts (.terraform/, lock files, outputs)
                if any(p.startswith(".terraform") or p == "output" for p in parts):
                    continue
                if f.is_file() and f.suffix in LAB_FILE_EXTS and f.name != "LAB.md":
                    files.append(
                        {
                            "path": f.relative_to(lab_dir).as_posix(),
                            "content": f.read_text(encoding="utf-8"),
                        }
                    )
        md, quiz = split_quiz(md, f"{rel}/README.md")
        lab_md = read(f"{rel}/lab/LAB.md") if (lab_dir / "LAB.md").exists() else ""
        lessons.append(
            {
                "id": d.name,
                "num": num,
                "title": short,
                "dir": rel,
                "md": md,
                "quiz": quiz,
                "lab": lab_md,
                "labCheckpoints": parse_checkpoints(lab_md, f"{rel}/lab/LAB.md"),
                "labFiles": files,
            }
        )
    return lessons


Q_RE = re.compile(r"^\*\*(\d+)\.\*\*\s+(.*)$")
OPT_RE = re.compile(r"^-\s+([A-Z])\.\s+(.*)$")


def parse_questions(body, answers, where):
    """Parse '**N.** stem' + '- A. option' questions and a '| N | A, B | explanation |' answer table."""
    questions, cur = [], None
    for line in body.splitlines():
        if m := Q_RE.match(line):
            cur = {"n": int(m.group(1)), "q": m.group(2).strip(), "options": []}
            questions.append(cur)
        elif cur and (m := OPT_RE.match(line)):
            cur["options"].append({"key": m.group(1), "text": m.group(2).strip()})
        elif cur and not cur["options"] and line.strip() and not line.startswith("---"):
            cur["q"] += "\n" + line  # multi-line stem (e.g. code)
    key = {}
    for line in answers.splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) >= 3 and cells[0].isdigit():
            key[int(cells[0])] = (cells[1], "|".join(cells[2:]).strip())
    for q in questions:
        ans, expl = key.get(q["n"], ("", ""))
        q["answer"] = [a.strip() for a in ans.split(",") if a.strip()]
        q["explanation"] = expl
        q["multi"] = len(q["answer"]) > 1
        if not q["answer"]:
            raise SystemExit(f"{where}: question {q['n']} has no answer in the key")
        if any(a not in {o["key"] for o in q["options"]} for a in q["answer"]):
            raise SystemExit(f"{where}: question {q['n']} answer {ans} isn't one of its options")
    return questions


def split_quiz(md, where):
    """Pull the '## Review quiz' section out of a lesson: (lesson md without it, questions)."""
    start = md.find("## Review quiz")
    if start < 0:
        return md, []
    end = md.find("➡️", start)
    end = len(md) if end < 0 else end
    section = md[start:end]
    body, _, answers = section.partition("<details>")
    return md[:start] + md[end:], parse_questions(body, answers, where)


CHECKPOINT_RE = re.compile(r"^```(question|check)\n(.*?)^```$", re.M | re.S)


def parse_checkpoints(md, where):
    """Lab checkpoints, in document order: ```question blocks (multiple choice) and ```check blocks
    (a shell command the lab server runs in the learner's sandbox). The `run` command stays server-side."""
    cps, seen, nq = [], set(), 0
    for kind, body in CHECKPOINT_RE.findall(md):
        fields, options = {}, []
        for line in body.splitlines():
            if m := OPT_RE.match(line):
                options.append({"key": m.group(1), "text": m.group(2).strip()})
            elif ":" in line:
                k, _, v = line.partition(":")
                fields[k.strip().lower()] = v.strip()
        if kind == "question":
            nq += 1
            answer = [a.strip() for a in fields.get("answer", "").split(",") if a.strip()]
            if not answer or any(a not in {o["key"] for o in options} for a in answer):
                raise SystemExit(f"{where}: question {nq} needs an `answer:` matching its options")
            cp = {
                "kind": "question",
                "id": f"q{nq}",
                "q": fields.get("q", ""),
                "options": options,
                "answer": answer,
                "multi": len(answer) > 1,
                "explanation": fields.get("explain", ""),
            }
        else:
            if not fields.get("id") or not fields.get("run"):
                raise SystemExit(f"{where}: every check needs `id:` and `run:`")
            cp = {
                "kind": "check",
                "id": fields["id"],
                "title": fields.get("title", fields["id"]),
                "hint": fields.get("hint", ""),
                "manual": fields.get("manual") == "allowed",
            }
        if cp["id"] in seen:
            raise SystemExit(f"{where}: duplicate checkpoint id {cp['id']}")
        seen.add(cp["id"])
        cps.append(cp)
    return cps


def build_exam(rel):
    md = read(rel)
    body, _, answers = md.partition("## Answers")
    return {
        "id": Path(rel).stem,
        "title": title_of(md, Path(rel).stem),
        "intro": body.split("**1.**")[0],
        "questions": parse_questions(body, answers, rel),
    }


def build_flashcards():
    cards = []
    for line in read("flashcards.md").splitlines():
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) == 3 and cells[0].isdigit():
            cards.append({"n": int(cells[0]), "q": cells[1], "a": cells[2]})
    return cards


def build_cheatsheets():
    return [
        {"id": f.stem, "title": title_of(f.read_text(encoding="utf-8"), f.stem), "md": f.read_text(encoding="utf-8")}
        for f in sorted((ROOT / "cheatsheets").glob("*.md"))
    ]


def main():
    content = {
        "readme": read("README.md"),
        "studyPlan": read("STUDY-PLAN.md"),
        "objectives": read("EXAM-OBJECTIVES.md"),
        "lessons": build_lessons(),
        "exams": [build_exam(p.relative_to(ROOT).as_posix()) for p in sorted((ROOT / "practice-exams").glob("*.md"))],
        "flashcards": build_flashcards(),
        "cheatsheets": build_cheatsheets(),
    }
    OUT.write_text(
        "// Generated by scripts/build-site.py — do not edit by hand.\n"
        "window.COURSE = " + json.dumps(content, ensure_ascii=False) + ";\n",
        encoding="utf-8",
    )
    print(
        f"Wrote {OUT.relative_to(ROOT)}: {len(content['lessons'])} lessons, "
        f"{sum(len(e['questions']) for e in content['exams'])} exam questions, "
        f"{sum(len(lesson['quiz']) for lesson in content['lessons'])} quiz questions, "
        f"{sum(len(lesson['labCheckpoints']) for lesson in content['lessons'])} lab checkpoints, "
        f"{len(content['flashcards'])} flashcards, {len(content['cheatsheets'])} cheatsheets"
    )


if __name__ == "__main__":
    main()
