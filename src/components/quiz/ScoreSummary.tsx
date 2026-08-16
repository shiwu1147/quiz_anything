import './quiz.css'
import type { Question } from '../../lib/schema'
import { scoreCommentary } from '../../lib/quizLogic'

export function ScoreSummary({
  hits,
  total,
  wrongEntries,
  onRestart,
}: {
  hits: number
  total: number
  wrongEntries: Array<{ question: Question; questionNumber: number }>
  onRestart: () => void
}) {
  const pct = total === 0 ? 0 : Math.round((hits / total) * 100)

  return (
    <div className="card">
      <div className="score">
        <div className="big">{hits}<span>/{total}</span></div>
        <div>答對率 {pct}%</div>
        <p>{scoreCommentary(pct)}</p>
      </div>
      {wrongEntries.length > 0 ? (
        <ul className="review">
          {wrongEntries.map(({ question, questionNumber }) => (
            <li key={question.id}>
              <span className="n">Q{String(questionNumber).padStart(2, '0')}</span>
              <span className="txt" dangerouslySetInnerHTML={{ __html: question.explanation }} />
            </li>
          ))}
        </ul>
      ) : (
        <p>全數答對，無錯題</p>
      )}
      <div className="bar">
        <span>重測會清空計分</span>
        <button type="button" className="ghost" onClick={onRestart}>再測一次</button>
      </div>
    </div>
  )
}
