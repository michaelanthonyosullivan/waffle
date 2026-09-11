export default function Header({ label }) {
  return (
    <header className="top">
      <h1>Waffle</h1>
      <p className="byline">by Michael O&apos;Sullivan</p>
      <p className="subtitle">{label}</p>
    </header>
  )
}
