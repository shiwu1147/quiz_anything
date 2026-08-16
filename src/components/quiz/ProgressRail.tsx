import './quiz.css'

export type RailResult = 'right' | 'wrong' | null

export function ProgressRail({
  total,
  current,
  results,
}: {
  total: number
  current: number
  results: RailResult[]
}) {
  return (
    <ol className="rail" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const result = results[i]
        const classes = ['']
        if (result === 'right') classes.push('is-right')
        if (result === 'wrong') classes.push('is-wrong')
        if (i === current && result === null) classes.push('is-here')
        return <li key={i} className={classes.filter(Boolean).join(' ')} />
      })}
    </ol>
  )
}
