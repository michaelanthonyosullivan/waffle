function SampleRow({ word, highlight, markClass, description }) {
  return (
    <li>
      <span className="sample">
        {word.split('').map((letter, index) => (
          <b key={index} className={index === highlight ? markClass : undefined}>
            {letter}
          </b>
        ))}
      </span>
      <span>{description}</span>
    </li>
  )
}

export default function HowToPlay({ onClose }) {
  return (
    <>
      <p>
        Rearrange the letters until <strong>every row and every column reads a word</strong>. Drag a letter
        anywhere on the board and the two tiles swap places.
      </p>

      <h3>Colours</h3>
      <ul className="legend">
        <SampleRow
          word="perky"
          highlight={0}
          markClass="is-green"
          description="Correct letter in the correct place."
        />
        <SampleRow
          word="knoll"
          highlight={1}
          markClass="is-yellow"
          description="In the word for that tile, but in a different position."
        />
        <SampleRow word="blank" highlight={-1} description="Not in any of the words that tile belongs to." />
      </ul>

      <h3>Swaps and stars</h3>
      <p>
        You get <strong>15 swaps</strong>. Every Waffle can be solved in <strong>10</strong>, and you earn a star
        for each swap you have left over — five at best.
      </p>

      <h3>The board</h3>
      <p>
        The middle of each long row and column crosses two words at once; the outer tiles belong to just one.
        Green tiles are already correct, so they cannot be moved or swapped onto.
      </p>

      <div className="modal-actions">
        <button className="button" type="button" onClick={onClose}>
          Got it
        </button>
      </div>
    </>
  )
}
