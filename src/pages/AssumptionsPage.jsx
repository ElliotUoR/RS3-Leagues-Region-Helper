import { ASSUMPTION_GROUPS } from '../data/assumptions';

export default function AssumptionsPage() {
  return (
    <>
      <header>
        <h1>Assumptions</h1>
      </header>

      <main className="assumptions-page">
        {ASSUMPTION_GROUPS.map((group) => (
          <section className="assumptions-group" key={group.id}>
            <h2>{group.title}</h2>
            {group.intro && <p className="assumptions-intro">{group.intro}</p>}
            <ul className="assumptions-list">
              {group.items.map((item) => (
                <li className="assumptions-item" key={item.title}>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </>
  );
}
