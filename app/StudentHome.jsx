"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Check,
  ChevronRight,
  Clock3,
  Copy,
  GraduationCap,
  Search,
  Sparkles,
  X,
  ExternalLink,
  Info,
} from "lucide-react";
import {
  degreeNames,
  selectActions,
  currentBrief,
  askPrompt,
  calendarFile,
  noticeText,
  classify,
} from "../lib/bridge/student.mjs";
const official = "https://ece.snu.ac.kr/community/academics";
const labels = {
  graduation_project: "Taking the Fall 2026 graduation project",
  spring2027_project: "Planning a Spring 2027 graduation project",
  project_round2: "Need the second project-assignment round",
  fall2026_thesis_review: "In the Fall 2026 thesis-review process",
  winter_course_registered: "Registered for a Winter 2026 course",
  lab_research: "Doing laboratory research",
  new_safety_training_completed: "Already completed new safety training",
  non_thesis_course: "Taking courses other than Thesis Research",
  hanwha_round2_confirmed:
    "Office confirmed the internship round and my eligibility",
  research_internship_selected: "Selected for the research internship",
  research_internship_applicant: "Applied for the research internship",
  engineering_classes_or_building302:
    "Use Building 302 or take engineering classes",
  building39_or_interviewer_classes:
    "Use Building 39 or take an interviewer’s class",
  thesis_research_430960: "Took Thesis Research 430.960 in Fall 2026",
  fall2026_registration_case: "Checking historical Fall 2026 registration",
};
const dformat = (raw) =>
  raw
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Seoul",
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(raw))
    : "Not checked";
function Link({ href, children, ...props }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
      {children}
      <ArrowUpRight size={14} />
    </a>
  );
}
function Download({ action }) {
  return (
    <button
      className="text-button"
      onClick={() => {
        const url = URL.createObjectURL(
          new Blob([calendarFile(action)], {
            type: "text/calendar;charset=utf-8",
          }),
        );
        const a = document.createElement("a");
        a.href = url;
        a.download = "snu-bridge-" + action.id + ".ics";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }}
    >
      <CalendarDays size={14} /> Add to calendar
    </button>
  );
}
function Condition({ action }) {
  return (
    <p className="condition">
      {action.conditions_note ||
        Object.entries(action.conditions || {})
          .map(([k, v]) =>
            v
              ? labels[k] || k
              : "Have not " +
                (k === "new_safety_training_completed"
                  ? "completed new safety training"
                  : labels[k] || k),
          )
          .join(" · ") ||
        "Check the notice’s audience."}
    </p>
  );
}
function Action({ item, open, compact = false }) {
  const closed = item.state === "past";
  return (
    <article
      className={
        "action-card " + (closed ? "past " : "") + (compact ? "compact" : "")
      }
    >
      <div className="action-top">
        <span
          className={
            "badge " + (item.change_note ? "changed" : closed ? "muted" : "")
          }
        >
          {item.change_note
            ? "Date extended"
            : closed
              ? "Past date"
              : item.importance?.startsWith("optional")
                ? "Optional opportunity"
                : "Check if this applies"}
        </span>
        <span className="small">
          {item.degrees.length === 4
            ? "All degrees"
            : item.degrees.map((d) => degreeNames[d]).join(" / ")}
        </span>
      </div>
      <button className="card-title" onClick={() => open(item.notice_id)}>
        {item.title}
        <ArrowUpRight size={19} />
      </button>
      <Condition action={item} />
      <div className="date-line">
        <Clock3 size={16} />
        <strong>{item.date_label}</strong>
        <span>KST</span>
      </div>
      {item.precision === "day" && (
        <p className="precision">
          The source gives a date, without an exact cutoff time.
        </p>
      )}
      {item.change_note && <p className="change-note">{item.change_note}</p>}
      {closed && item.past_next_step && (
        <p className="small">{item.past_next_step}</p>
      )}
      {!compact && item.steps?.length > 0 && (
        <p className="next-step">
          <span>Next step</span> {item.steps[0]}
        </p>
      )}
      <div className="card-bottom">
        <button className="text-button" onClick={() => open(item.notice_id)}>
          Read the English brief <ChevronRight size={14} />
        </button>
        {!closed && item.end && <Download action={item} />}
      </div>
    </article>
  );
}
function NoticeDetail({ b, data, back, degree, ask }) {
  const n = data.notices.find((n) => n.id === b.notice_id),
    valid = currentBrief(b, n),
    aa = data.actions.filter((a) => a.notice_id === b.notice_id);
  return (
    <section className="detail">
      <button className="text-button" onClick={back}>
        <ArrowLeft size={16} /> Back to your briefing
      </button>
      <div className="detail-heading">
        <p className="eyebrow">
          {b.topic} <span> / </span> {b.period}
        </p>
        <h1>{b.title}</h1>
        <div className="tag-row">
          <span className="badge muted">
            AI draft · not independently reviewed
          </span>
          <span className="small">
            Source checked {dformat(n.source_checked_at)}
          </span>
        </div>
        <p className="lead">{b.summary}</p>
        {!valid && (
          <div className="notice-warning">
            <strong>The original has changed.</strong> This English brief is for
            an older version. Confirm the current official notice before using
            its dates.
          </div>
        )}
      </div>
      <div className="detail-layout">
        <div>
          <section className="paper">
            <h2>What to do</h2>
            <ol className="steps">
              {b.steps.map((s, i) => (
                <li key={i}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <p>{s}</p>
                </li>
              ))}
            </ol>
          </section>
          {b.notes.length > 0 && (
            <section className="paper">
              <h2>Before you act</h2>
              <ul className="plain-list">
                {b.notes.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </section>
          )}
          <section className="paper">
            <h2>Check the evidence</h2>
            <p className="small">
              {b.english_kind}. {b.reading_note}
            </p>
            {b.evidence_quote && (
              <blockquote lang="ko">{b.evidence_quote}</blockquote>
            )}
            <Link href={n.source_url} className="source-link">
              Read the current official notice
            </Link>
            <details>
              <summary>Original Korean text read for this brief</summary>
              <pre className="source-text" lang="ko">
                {noticeText(n)}
              </pre>
            </details>
            {n.attachments?.length > 0 && (
              <details>
                <summary>
                  {n.attachments.length} attached file
                  {n.attachments.length === 1 ? "" : "s"} — not read
                </summary>
                <p className="small">
                  Open the official notice to download the original files. A
                  filename alone is not evidence of its contents.
                </p>
                <ul className="plain-list small">
                  {n.attachments.map((a, i) => (
                    <li key={i}>{a.name}</li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        </div>
        <aside>
          <section className="sidebar-card dark">
            <Sparkles size={22} />
            <h2>Still unsure about your situation?</h2>
            <p>
              Carry this notice and your degree into ChatGPT. Ask one useful
              follow-up.
            </p>
            <button className="light-button" onClick={() => ask(b)}>
              Ask about this notice <ArrowUpRight size={16} />
            </button>
          </section>
          {aa.length > 0 && (
            <section className="sidebar-card">
              <h3>Dates in this notice</h3>
              {aa.map((a) => (
                <div className="mini-date" key={a.id}>
                  <span
                    className={
                      "badge " + (classify(a) === "past" ? "muted" : "")
                    }
                  >
                    {a.kind === "event"
                      ? "Event"
                      : a.kind === "unknown_deadline"
                        ? "Needs checking"
                        : classify(a) === "past"
                          ? "Past date"
                          : "Action"}
                  </span>
                  <strong>{a.date_label}</strong>
                  <p>{a.title}</p>
                  {valid && a.end && classify(a) !== "past" && (
                    <Download action={{ ...a, notice: n }} />
                  )}
                </div>
              ))}
            </section>
          )}
          <section className="sidebar-card quiet">
            <p className="small">
              Degree: {degreeNames[degree]}. Degree filtering suggests
              relevance; it does not certify eligibility.
            </p>
          </section>
        </aside>
      </div>
    </section>
  );
}
const englishCourse = {
  "컴퓨터의 개념 및 실습": "Computer Concepts and Practice",
  공학수학1: "Engineering Mathematics 1",
  공학수학2: "Engineering Mathematics 2",
  물리학2: "Physics 2",
  고급물리학2: "Advanced Physics 2",
  일반물리학및실험2: "General Physics and Experiment 2 (Physics Education)",
  "기초회로이론 및 실험": "Basic Circuit Theory and Laboratory",
  "기초전자기학 및 연습": "Basic Electromagnetics and Exercises",
};
function Guides({ guide, degree, open, ask }) {
  const graduate = degree !== "undergraduate" && degree !== "unsure";
  const [track, setTrack] = useState("computing");
  const [course, setCourse] = useState(1);
  const [checked, setChecked] = useState({});
  const prereq = guide.official_prerequisite_examples[course];
  return (
    <section id="start" className="guide-section">
      <div className="section-heading">
        <div>
          <p className="eyebrow">START WITH THE ESSENTIALS</p>
          <h2>Things you should not have to discover late.</h2>
        </div>
        <BookOpen size={26} />
      </div>
      {guide.needs_recheck && (
        <p className="notice-warning">
          A source used by this guide has changed. Treat these examples as
          historical until the guide is rechecked; use the current official
          sources.
        </p>
      )}
      <div className="guide-intro">
        <p>
          Start with your degree and entry cohort. Each checklist leads to the
          actual procedure and its source.
        </p>
        <span className="badge muted">Your checklist stays in this page</span>
      </div>
      <div className="guide-grid">
        <section className="paper">
          <p className="eyebrow">
            {graduate ? "GRADUATE STUDENTS" : "UNDERGRADUATE STUDENTS"}
          </p>
          <h3>
            {graduate
              ? "From coursework to your degree"
              : "Before you choose your courses"}
          </h3>
          <div className="checklist">
            {(graduate
              ? guide.graduate_first_steps
              : guide.undergraduate_first_steps
            ).map((s, i) => (
              <div className="check-row" key={s.title}>
                <input
                  id={"guide-" + i}
                  type="checkbox"
                  checked={!!checked[(graduate ? "g" : "u") + i]}
                  onChange={(e) =>
                    setChecked({
                      ...checked,
                      [(graduate ? "g" : "u") + i]: e.target.checked,
                    })
                  }
                />
                <div>
                  <label htmlFor={"guide-" + i}>{s.title}</label>
                  <p>{s.why}</p>
                  {s.source ? (
                    <Link href={s.source}>Official requirements</Link>
                  ) : (
                    <button
                      className="text-button"
                      onClick={() => open(s.notice_id || s.notice_ids[0])}
                    >
                      Read the guidance <ChevronRight size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="paper essentials">
          <p className="eyebrow">EASY TO CONFUSE</p>
          <h3>
            {graduate
              ? "Three distinctions that matter"
              : "A good course plan starts here"}
          </h3>
          {(graduate
            ? [
                [
                  "Coursework completion ≠ degree award",
                  "수료 means completion of the coursework stage. Publication, thesis review and final submission can still remain.",
                  "56747",
                ],
                [
                  "An ethics course ≠ online ethics training",
                  "One is a credit-bearing course requirement for specified cohorts; the other is a separate training notice. Check both.",
                  "51949",
                ],
                [
                  "Submitting a paper ≠ having it accepted",
                  "The master’s publication rule changed for Fall 2026. A submitted manuscript alone no longer meets the stated rule.",
                  "57606",
                ],
              ]
            : [
                [
                  "Your entry cohort matters",
                  "Required courses, credit categories and general education can change between cohorts. Start with your own rules.",
                  "57374",
                ],
                [
                  "Useful preparation ≠ a required prerequisite",
                  "Some arrows in a student roadmap mean “helpful before this course.” Only the official prerequisites are mandatory.",
                  "57374",
                ],
                [
                  "A project semester ≠ your graduation semester",
                  "You may need to finish and sign your thesis before the semester in which you graduate.",
                  "58045",
                ],
              ]
          ).map(([t, p, id]) => (
            <div className="essential" key={t}>
              <h4>{t}</h4>
              <p>{p}</p>
              <button className="text-button" onClick={() => open(id)}>
                See the source-backed explanation <ChevronRight size={13} />
              </button>
            </div>
          ))}
        </section>
      </div>
      {!graduate && !guide.needs_recheck && (
        <section className="course-panel">
          <div>
            <p className="eyebrow">COURSE COMPASS</p>
            <h3>
              See the connections.
              <br />
              Check the actual rules.
            </h3>
            <p>
              Explore a study area, then inspect an official prerequisite. These
              are examples from the revised Spring 2026 guide, not a complete
              degree audit.
            </p>
            <div className="track-tabs">
              {Object.entries(guide.exploration_paths).map(([k, v]) => (
                <button
                  key={k}
                  className={track === k ? "active" : ""}
                  onClick={() => setTrack(k)}
                >
                  {v.label}
                </button>
              ))}
            </div>
            <ol className="course-path">
              {guide.exploration_paths[track].courses.map((c, i) => (
                <li key={c}>
                  <span>{i + 1}</span>
                  <div>
                    {c.split(" (")[0]}
                    <small lang="ko">
                      {c.includes(" (")
                        ? c.split(" (")[1].replace(/\)$/, "")
                        : ""}
                    </small>
                  </div>
                </li>
              ))}
            </ol>
            <p className="small">
              Exploration path adapted from a peer-provided map. This is not a
              verified chain of prerequisites.
            </p>
          </div>
          <div className="prerequisite">
            <span className="badge">Official prerequisite example</span>
            <label htmlFor="course">Choose a course</label>
            <select
              id="course"
              value={course}
              onChange={(e) => setCourse(Number(e.target.value))}
            >
              {guide.official_prerequisite_examples.map((p, i) => (
                <option key={i} value={i}>
                  {p.course_en}
                </option>
              ))}
            </select>
            <p className="small">{prereq.cohort}</p>
            <h4>You need all of these:</h4>
            {prereq.all_of.map((item, i) => (
              <div className="requirement" key={i}>
                <Check size={18} />
                <div>
                  {typeof item === "string" ? (
                    <>
                      <strong>{englishCourse[item] || item}</strong>
                      <small lang="ko">{item}</small>
                    </>
                  ) : (
                    <>
                      <strong>One of these alternatives</strong>
                      <ul>
                        {item.any_of.map((c) => (
                          <li key={c}>
                            {englishCourse[c] || c}
                            <small lang="ko">{c}</small>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              </div>
            ))}
            {prereq.exception && (
              <p className="notice-warning">{prereq.exception}</p>
            )}
            <button className="text-button" onClick={() => open("57374")}>
              Open the revised guide <ChevronRight size={14} />
            </button>
            <p className="small">
              A peer map puts Advanced Control Techniques in semester 2; the
              official guide says semester 1 from 2026. Check the current
              offering.
            </p>
          </div>
        </section>
      )}
      <div className="quick-links">
        <Link href="https://sugang.snu.ac.kr">Course registration</Link>
        <Link href="https://my.snu.ac.kr">mySNU</Link>
        <Link href="https://etl.snu.ac.kr">eTL</Link>
        <Link href="https://ece.snu.ac.kr/academics/undergraduate/requirements">
          Undergraduate cohort requirements
        </Link>
        <Link href={official}>ECE academic notices</Link>
      </div>
    </section>
  );
}
function About({ data }) {
  return (
    <section id="sources" className="about-section">
      <p className="eyebrow">KNOW WHERE THE ANSWER COMES FROM</p>
      <h2>
        Shared information.
        <br />
        Visible evidence.
      </h2>
      <div className="about-grid">
        <div>
          <h3>Korean and English boards are different.</h3>
          <p>
            We compare the procedure, semester, audience and actions inside each
            notice. A matching number or a similar title does not establish an
            English counterpart.
          </p>
          <div className="comparison">
            <div>
              <span>Thesis Research confirmation</span>
              <strong>No counterpart found in checked English HTML</strong>
            </div>
            <div>
              <span>Graduation-project poster</span>
              <strong>No counterpart found in checked English HTML</strong>
            </div>
            <div>
              <span>Winter tuition</span>
              <strong>English PDF listed on the Korean page</strong>
            </div>
          </div>
          <p className="small">
            Bounded audit on 10 Nov 2026: 22 English-board posts dated 2026,
            list pages 1–3, and three Korean procedures. Attachment contents
            were not read. This is not a university-wide coverage score.
          </p>
          <div className="quick-links">
            <Link href="https://ece.snu.ac.kr/en/community/notice">
              Official English board
            </Link>
            <Link href="https://ece.snu.ac.kr/community/academics?md=v&bbsidx=58022">
              Thesis Research source
            </Link>
            <Link href="https://ece.snu.ac.kr/community/academics?md=v&bbsidx=58196">
              Poster source
            </Link>
            <Link href="https://ece.snu.ac.kr/community/academics?md=v&bbsidx=58200">
              Tuition source
            </Link>
          </div>
        </div>
        <div className="paper">
          <h3>What this version covers</h3>
          <dl className="facts">
            <div>
              <dt>Department</dt>
              <dd>SNU ECE academic notices</dd>
            </div>
            <div>
              <dt>English briefs</dt>
              <dd>{data.briefs.length} original AI drafts</dd>
            </div>
            <div>
              <dt>Independent review</dt>
              <dd>Not completed</dd>
            </div>
            <div>
              <dt>Source check</dt>
              <dd>{dformat(data.status.source_checked_at)}</dd>
            </div>
            <div>
              <dt>English update</dt>
              <dd>{dformat(data.status.english_updated_at)}</dd>
            </div>
            <div>
              <dt>Daily translation</dt>
              <dd>
                {data.status.automation?.translator === "enabled"
                  ? "Configured; see update status"
                  : "Awaiting model-provider configuration"}
              </dd>
            </div>
          </dl>
          <p className="small">
            Changes are detected only in detail pages successfully fetched
            during the scan. Files and images are inventoried; unread content is
            flagged. A failed check keeps the last good publication.
          </p>
          <p className="small">
            Calendar downloads are one-time copies. This page does not send
            personal reminders or certify graduation eligibility.
          </p>
        </div>
      </div>
      <div className="method-strip">
        <span>
          <b>01</b> Read the official source
        </span>
        <ChevronRight size={18} />
        <span>
          <b>02</b> Explain the action and conditions
        </span>
        <ChevronRight size={18} />
        <span>
          <b>03</b> Check the evidence before acting
        </span>
      </div>
    </section>
  );
}
export default function StudentHome() {
  const [data, setData] = useState(null),
    [error, setError] = useState(""),
    [degree, setDegree] = useState("unsure"),
    [query, setQuery] = useState(""),
    [archive, setArchive] = useState(false),
    [showAll, setShowAll] = useState(false),
    [selected, setSelected] = useState(null),
    [chat, setChat] = useState(null),
    [copied, setCopied] = useState(false),
    [answers, setAnswers] = useState({}),
    [personalize, setPersonalize] = useState(false),
    [view, setView] = useState("briefing");
  useEffect(() => {
    fetch("./data/student.json", { cache: "no-store" })
      .then((r) => {
        if (!r.ok) throw Error("The notice data could not be loaded.");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message));
    const onHash = () => {
      const h = location.hash.slice(1);
      setSelected(h.startsWith("notice/") ? h.slice(7) : null);
      if (["briefing", "start", "notices", "sources"].includes(h)) setView(h);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  function open(id) {
    if (!data.briefs.some((b) => b.notice_id === id)) {
      window.open(
        official + "?md=v&bbsidx=" + encodeURIComponent(id),
        "_blank",
        "noopener",
      );
      return;
    }
    location.hash = "notice/" + id;
    setSelected(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function navigate(id) {
    setSelected(null);
    setView(id);
    location.hash = id;
    requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }),
    );
  }
  const ask = (b) => {
    setChat({ brief: b || null });
    setCopied(false);
  };
  useEffect(() => {
    if (!chat) return;
    const before = document.activeElement;
    const dialog = document.querySelector(".chat-dialog");
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog?.querySelector("button")?.focus();
    const key = (e) => {
      if (e.key === "Escape") {
        setChat(null);
        return;
      }
      if (e.key === "Tab") {
        const items = [
          ...dialog.querySelectorAll("button,a[href],textarea,summary"),
        ].filter((el) => el.getClientRects().length);
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", key);
      before?.focus?.();
    };
  }, [chat]);
  const groups = data
    ? selectActions(data, { degree, includePast: archive, answers })
    : null;
  const chosen = data?.briefs.find((b) => b.notice_id === selected);
  const filtered = data?.briefs
    .filter(
      (b) =>
        (degree === "unsure" || b.degrees.includes(degree)) &&
        `${b.title} ${b.summary} ${b.topic} ${data.notices.find((n) => n.id === b.notice_id)?.korean_title}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(a.period.includes("historical")) -
          Number(b.period.includes("historical")) ||
        b.generated_at.localeCompare(a.generated_at),
    );
  return (
    <>
      <a className="skip-link" href="#content">
        Skip to content
      </a>
      <header className="site-header">
        <a
          className="brand"
          href="#briefing"
          onClick={() => navigate("briefing")}
          aria-label="SNU Bridge home"
        >
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            SNU Bridge<small>ECE · Student essentials</small>
          </span>
        </a>
        <nav aria-label="Main navigation">
          {[
            ["briefing", "My briefing"],
            ["start", "Start at ECE"],
            ["notices", "English notices"],
            ["sources", "Our sources"],
          ].map(([id, label]) => (
            <a
              className={!selected && view === id ? "active" : ""}
              key={id}
              href={"#" + id}
              onClick={(e) => {
                e.preventDefault();
                navigate(id);
              }}
            >
              {label}
            </a>
          ))}
        </nav>
        <button
          aria-label="Ask with ChatGPT"
          className="chat-button"
          onClick={() => ask(null)}
        >
          <Sparkles size={16} />
          <span>Ask with ChatGPT</span>
        </button>
      </header>
      <main id="content">
        {error ? (
          <section className="paper load-error">
            <h1>We could not load your briefing.</h1>
            <p>
              Your connection may be unavailable. This does not mean there are
              no notices.
            </p>
            <button
              className="primary-button"
              onClick={() => location.reload()}
            >
              Try again
            </button>
            <Link href={official}>Open the official ECE board</Link>
          </section>
        ) : !data ? (
          <section className="loading" role="status">
            <span className="loader" />
            <p>Opening your ECE briefing…</p>
          </section>
        ) : chosen ? (
          <NoticeDetail
            b={chosen}
            data={data}
            degree={degree}
            ask={ask}
            back={() => navigate("briefing")}
          />
        ) : (
          <>
            <section className="hero" id="briefing">
              <div>
                <p className="eyebrow">
                  <span className="live-dot" /> ENGLISH GUIDANCE FOR
                  INTERNATIONAL STUDENTS
                </p>
                <h1>
                  Make sense of university.
                  <br />
                  <em>Know your next step.</em>
                </h1>
                <p className="hero-copy">
                  The notices that matter, the details that are easy to miss,
                  <br className="desktop-br" /> and a clearer way through ECE.
                </p>
              </div>
              <div className="hero-note">
                <span className="tiny-label">YOUR DEPARTMENT, IN CONTEXT</span>
                <p>
                  Start with the information.
                  <br />
                  Ask when you need more.
                </p>
                <a
                  href="#start"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate("start");
                  }}
                >
                  New to ECE? Start here <ArrowUpRight size={17} />
                </a>
              </div>
            </section>
            <section className="profile-bar" aria-label="Filter by degree">
              <div>
                <span className="filter-caption">I AM A…</span>
                <div className="degree-tabs">
                  {Object.entries(degreeNames).map(([key, label]) => (
                    <button
                      key={key}
                      aria-pressed={degree === key}
                      className={degree === key ? "selected" : ""}
                      onClick={() => {
                        setDegree(key);
                        setAnswers({});
                        setShowAll(false);
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                className="text-button"
                onClick={() => setPersonalize(!personalize)}
              >
                {personalize ? "Close" : "Refine my situation"}{" "}
                <ChevronRight size={14} />
              </button>
            </section>
            {personalize && (
              <section className="profile-details">
                <p>
                  Leave “Not sure” selected to keep conditional notices visible.
                  These answers stay in this page.
                </p>
                {Object.entries(labels)
                  .filter(([key]) =>
                    data.actions.some(
                      (a) =>
                        a.conditions?.[key] !== undefined &&
                        (degree === "unsure" || a.degrees.includes(degree)),
                    ),
                  )
                  .map(([key, label]) => (
                    <label key={key}>
                      {label}
                      <select
                        value={
                          answers[key] === undefined
                            ? "unknown"
                            : String(answers[key])
                        }
                        onChange={(e) =>
                          setAnswers({
                            ...answers,
                            [key]:
                              e.target.value === "unknown"
                                ? undefined
                                : e.target.value === "true",
                          })
                        }
                      >
                        <option value="unknown">Not sure / show me</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    </label>
                  ))}
              </section>
            )}
            <div className="freshness">
              <span>
                <Check size={14} /> Sources checked{" "}
                {dformat(data.status.source_checked_at)}
              </span>
              <span>AI drafts · check the linked official notice</span>
              <a
                href="#sources"
                onClick={(e) => {
                  e.preventDefault();
                  navigate("sources");
                }}
              >
                Coverage & update status <ArrowUpRight size={12} />
              </a>
            </div>
            <section className="briefing-layout">
              <div>
                <div className="section-heading action-heading">
                  <div>
                    <p className="eyebrow">YOUR ACTION BOARD</p>
                    <h2>What you need to do</h2>
                    <p>Conditional next steps for the coming 120 days.</p>
                  </div>
                  <span className="count">{groups.due.length}</span>
                </div>
                <div className="action-list">
                  {(showAll ? groups.due : groups.due.slice(0, 5)).map((a) => (
                    <Action key={a.id} item={a} open={open} />
                  ))}
                  {!groups.due.length && (
                    <div className="paper empty">
                      <BookOpen size={28} />
                      <h3>No dated actions match these choices.</h3>
                      <p>
                        There may still be items to check, upcoming events and
                        degree requirements. This is a selected-notice pilot,
                        not a complete record of your obligations.
                      </p>
                      <button
                        className="text-button"
                        onClick={() => {
                          setDegree("unsure");
                          setAnswers({});
                          setQuery("");
                        }}
                      >
                        Reset filters
                      </button>
                    </div>
                  )}
                </div>
                {groups.due.length > 5 && (
                  <button
                    className="more-button"
                    onClick={() => setShowAll(!showAll)}
                  >
                    {showAll
                      ? "Show fewer actions"
                      : `Show all ${groups.due.length} actions`}{" "}
                    <ChevronRight size={16} />
                  </button>
                )}
                <label className="archive-toggle">
                  <input
                    type="checkbox"
                    checked={archive}
                    onChange={(e) => setArchive(e.target.checked)}
                  />{" "}
                  Show past dates for context
                </label>
                {archive &&
                  groups.past.map((a) => (
                    <Action key={a.id} item={a} open={open} compact />
                  ))}
              </div>
              <aside className="briefing-side">
                <section className="sidebar-card start-card">
                  <span className="icon-tile">
                    <GraduationCap size={24} />
                  </span>
                  <p className="eyebrow">BEFORE YOU ASK</p>
                  <h3>
                    A little context
                    <br />
                    goes a long way.
                  </h3>
                  <p>
                    {degree === "undergraduate" || degree === "unsure"
                      ? "Find your cohort’s requirements, explore course paths and check the prerequisites."
                      : "Understand coursework completion, training and the stages leading to your degree."}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => navigate("start")}
                  >
                    Open your starting checklist <ChevronRight size={15} />
                  </button>
                </section>
                {groups.check.length > 0 && (
                  <section className="sidebar-card check-card">
                    <p className="eyebrow">NEEDS A CLOSER LOOK</p>
                    <h3>A missing date matters.</h3>
                    {groups.check.map((a) => (
                      <div className="check-item" key={a.id}>
                        <button onClick={() => open(a.notice_id)}>
                          {a.title}
                          <ArrowUpRight size={15} />
                        </button>
                        <p>{a.date_label}</p>
                        <Condition action={a} />
                      </div>
                    ))}
                  </section>
                )}
                <section className="sidebar-card">
                  <div className="sidebar-title">
                    <CalendarDays size={20} />
                    <h3>Coming up</h3>
                  </div>
                  <p className="small">
                    Events and information dates — separate from application
                    deadlines.
                  </p>
                  {groups.events.slice(0, 5).map((a) => (
                    <button
                      key={a.id}
                      className="event-row"
                      onClick={() => open(a.notice_id)}
                    >
                      <span>{a.date_label}</span>
                      <strong>{a.title}</strong>
                      <ChevronRight size={15} />
                    </button>
                  ))}
                  {groups.events.length === 0 && (
                    <p className="small">
                      No event dates match the current filters.
                    </p>
                  )}
                </section>
              </aside>
            </section>
            <Guides guide={data.guide} degree={degree} open={open} ask={ask} />
            <section id="notices" className="notices-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">READ ONCE. UNDERSTAND MORE.</p>
                  <h2>Your English notice library</h2>
                  <p>
                    Original English action briefs, with conditions and source
                    evidence.
                  </p>
                </div>
                <span className="badge muted">
                  {filtered.length} briefs for this view
                </span>
              </div>
              <label className="search">
                <Search size={19} />
                <input
                  aria-label="Search English notices"
                  placeholder="Search a procedure, course or keyword…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
                {query && (
                  <button
                    aria-label="Clear search"
                    onClick={() => setQuery("")}
                  >
                    <X size={17} />
                  </button>
                )}
              </label>
              <div className="notice-grid">
                {filtered.map((b) => (
                  <button
                    className="notice-tile"
                    key={b.notice_id}
                    onClick={() => open(b.notice_id)}
                  >
                    <span className="tile-topic">{b.topic}</span>
                    <h3>{b.title}</h3>
                    <p>{b.summary}</p>
                    <span className="tile-bottom">
                      {b.period}
                      <ArrowUpRight size={16} />
                    </span>
                  </button>
                ))}
              </div>
              {filtered.length === 0 && (
                <p className="empty paper">
                  No brief matches this search. Try a broader term or choose All
                  students.
                </p>
              )}
            </section>
            <About data={data} />
          </>
        )}
      </main>
      <footer className="site-footer">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span>
            SNU Bridge<small>Less searching. Clearer next steps.</small>
          </span>
        </div>
        <p>
          An independent student project. ECE pilot.
          <br />
          AI explanations may contain errors. The current official notice
          controls.
        </p>
        <Link href={official}>Official ECE board</Link>
      </footer>
      {chat && (
        <div
          className="dialog-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setChat(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="chat-title"
            className="chat-dialog"
          >
            <button
              className="close-dialog"
              aria-label="Close ChatGPT question"
              onClick={() => setChat(null)}
            >
              <X size={21} />
            </button>
            <span className="icon-tile">
              <Sparkles size={24} />
            </span>
            <h2 id="chat-title">Take the context with you.</h2>
            <p>
              Your question includes the source, your degree and the checks that
              make the answer useful.
            </p>
            <label htmlFor="chat-prompt">Ready-to-use question</label>
            <textarea
              id="chat-prompt"
              readOnly
              value={askPrompt({ degree, brief: chat.brief })}
              onFocus={(e) => e.target.select()}
            />
            <div className="dialog-actions">
              <button
                className="primary-button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(
                      askPrompt({ degree, brief: chat.brief }),
                    );
                    setCopied(true);
                  } catch {
                    document.getElementById("chat-prompt")?.select();
                    setCopied(false);
                  }
                }}
              >
                {copied ? <Check size={17} /> : <Copy size={17} />}{" "}
                {copied ? "Copied" : "Copy question"}
              </button>
              <Link className="secondary-button" href="https://chatgpt.com/">
                Open ChatGPT
              </Link>
            </div>
            <p className="small" role="status">
              {copied
                ? "Paste the question into your ChatGPT conversation."
                : "You can also select and copy the question manually."}
            </p>
            <details>
              <summary>Already have access to the SNU Bridge plugin?</summary>
              <p className="small">
                The plugin adds SNU-specific instructions. Workspace sharing is
                still being tested; its link alone does not grant access. You
                can use the question above in ordinary ChatGPT.
              </p>
              <Link href="https://chatgpt.com/plugins/plugin_ed558e3e3ce08191b3ba6544f0541575">
                Open the SNU Bridge plugin
              </Link>
            </details>
          </section>
        </div>
      )}
    </>
  );
}
