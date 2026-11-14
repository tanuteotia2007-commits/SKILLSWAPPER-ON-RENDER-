"""Skill verification quiz bank + scoring, and learning-plan generator."""
BANK = {
 "python": [("Which creates a list in Python?", ["(1,2)", "[1,2]", "{1,2}"], 1), ("len('abc') returns?", ["2", "3", "4"], 1), ("Keyword to define a function?", ["func", "def", "fn"], 1)],
 "ml": [("Overfitting means?", ["Good on train, bad on new data", "Bad on train data", "Too little data only"], 0), ("Which is supervised learning?", ["K-means", "Linear regression", "PCA"], 1), ("Cosine similarity measures?", ["Angle between vectors", "Pixel distance", "Sorting order"], 0)],
 "web": [("Which tag makes a link?", ["<a>", "<p>", "<img>"], 0), ("CSS stands for?", ["Cascading Style Sheets", "Code Style System", "Creative Style Sheets"], 0), ("Which runs in the browser?", ["JavaScript", "SQL only", "Bash"], 0)],
 "ui": [("A wireframe is?", ["Low-fidelity layout", "Final code", "A logo"], 0), ("Good UX focuses on?", ["User needs", "Only colors", "Only animation"], 0), ("Which is a design tool?", ["Figma", "Docker", "Git"], 0)],
 "video": [("A 'cut' in editing is?", ["Transition between clips", "Audio filter", "Export"], 0), ("Common film frame rate?", ["24 fps", "3 fps", "500 fps"], 0), ("Color grading adjusts?", ["Look and tone", "File size only", "Subtitles"], 0)],
 "graphic": [("RGB is used for?", ["Screens", "Offset printing only", "Fonts"], 0), ("Vector graphics are?", ["Resolution independent", "Pixel only", "Audio"], 0), ("Contrast helps?", ["Readability", "File size", "Nothing"], 0)],
 "gen": [("Best way to master a skill?", ["Practice with projects", "Only reading", "Skipping basics"], 0), ("Good teaching involves?", ["Examples and feedback", "Only lectures", "No questions"], 0), ("Best proof of skill?", ["A working project", "A claim", "Nothing"], 0)],
}
import re
LV = ["Beginner", "Intermediate", "Advanced"]


def key(skill):
    s = skill.lower()
    for k, pat in (("python", r"python"), ("ml", r"machine|\bml\b|deep|data"), ("web", r"web|html|css|react|js"),
                   ("ui", r"\bui\b|ux|figma"), ("video", r"video|premiere"), ("graphic", r"graphic|canva|design")):
        if re.search(pat, s): return k
    return "gen"


def questions(skill):
    return [{"q": q, "options": o} for q, o, _ in BANK[key(skill)]]


def score(skill, answers, evidence):
    qs = BANK[key(skill)]
    correct = sum(1 for i, (_, _, a) in enumerate(qs) if i < len(answers) and answers[i] == a)
    ev = bool(re.match(r"^https?://\S+", evidence or ""))
    return {"score": round(70 * correct / len(qs) + (30 if ev else 0)), "correct": correct, "total": len(qs), "evidence": ev}


def study_plan(skill, level):
    lv = LV[level - 1]
    return [{"week": 1, "title": f"Fundamentals of {skill}", "task": f"Cover core concepts at {lv} level; make 1-page notes."},
            {"week": 2, "title": "Guided practice", "task": "Solve 5 small exercises while your partner reviews."},
            {"week": 3, "title": "Mini project", "task": f"Build a small {skill} project and keep a link as evidence."},
            {"week": 4, "title": "Review & teach-back", "task": "Explain what you learned to your partner; retake the assessment."}]


def revision_notes(skill):
    return [f"Write 3 key takeaways about {skill} after every session.", "Re-solve one exercise without help.", "Note doubts to ask in the next session."]


def suggestion(pre, post):
    if pre is None or post is None: return None
    d = post - pre
    if d >= 3: return "Great progress! Next: build a bigger project and teach it to someone else."
    if d > 0: return "Steady gains. Do 2 more practice sessions and revisit weak topics."
    return "No gain yet. Redo Week 1-2 tasks and ask your partner for feedback."
