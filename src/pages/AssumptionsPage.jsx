import { ASSUMPTION_GROUPS, JMOD_CONFIRMATIONS } from '../data/assumptions';

export default function AssumptionsPage() {
  return (
    <>
      <header>
        <h1>Assumptions</h1>
      </header>

      <main className="assumptions-page">
        <section className="jmod-confirmed-callout">
          <h2>Confirmed from JMods</h2>
          <ul className="assumptions-list">
            {JMOD_CONFIRMATIONS.map((item) => (
              <li className="assumptions-item" key={item.title}>
                <strong>{item.title}</strong>
                <p>{item.detail}</p>
              </li>
            ))}
          </ul>
        </section>

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
