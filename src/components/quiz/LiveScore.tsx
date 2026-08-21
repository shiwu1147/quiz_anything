import './quiz.css'

export function LiveScore({
  answered,
  total,
  hits,
  wrongEntries,
}: {
  answered: number
  total: number
  hits: number
  wrongEntries: Array<{ questionNumber: number; tag?: string }>
}) {
  return (
    <aside className="quiz-live">
      <section>
        <p className="quiz-live-head">進度</p>
        <p className="quiz-live-big">{answered} / {total}</p>
        <p className="quiz-live-sub">答對 {hits}</p>
      </section>
      <section>
        <p className="quiz-live-head">錯題</p>
        {wrongEntries.length === 0 ? (
          <p className="quiz-live-sub">還沒有錯題。</p>
        ) : (
          <ul className="quiz-live-wrong">
            {wrongEntries.map((entry) => (
              <li key={entry.questionNumber}>
                <span className="quiz-live-n">{String(entry.questionNumber).padStart(2, '0')}</span>
                {entry.tag && <span className="quiz-live-tag">{entry.tag}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  )
}
