import { tokenizeProse } from '../utils/buildProseTokens';

// Renders a build's long-form prose field. Emphasis comes from tokenizeProse -
// see the note there for why it is derived at render time rather than authored
// into the data.
export default function BuildProse({ text }) {
  // The first paragraph is the thesis in both fields, so it gets lead styling -
  // the rest is supporting detail and steps down a size.
  return text.split('\n\n').map((paragraph, i) => (
    <p key={paragraph.slice(0, 40)} className={i === 0 ? 'build-prose-lead' : undefined}>
      {tokenizeProse(paragraph).map((run) =>
        run.kind ? (
          <span key={run.at} className={`build-prose-${run.kind}`}>
            {run.text}
          </span>
        ) : (
          run.text
        ),
      )}
    </p>
  ));
}
