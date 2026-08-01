import { useState } from 'react';
import { voteOnBuild } from '../utils/api';

// Up/down voting plus a Report button, shown on every user-submitted build.
//
// One vote per session, enforced by a primary key on (build_id, session_id)
// in Postgres - not by hiding the buttons. The session id is derived
// server-side from IP + User-Agent + a daily-rotating salt, so it cannot be
// spoofed by a client, but it does rotate at UTC midnight: "one vote" really
// means one vote per browser per day. That is the honest ceiling without
// accounts, and it matches how every other count on this site works.
//
// Clicking your existing vote again retracts it (sends 0), which is what the
// pressed state implies and costs nothing to support.
//
// The score never goes below zero - the server clamps it. The underlying rows
// are NOT clamped, so a heavily-downvoted build has to climb all the way back
// before it moves off 0 rather than bouncing to 1 on a single upvote.
export default function BuildVoteBar({ buildId, score, myVote, onVoted, onReport }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function cast(direction) {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      // Pressing the button you already chose retracts it.
      const next = myVote === direction ? 0 : direction;
      const result = await voteOnBuild(buildId, next);
      // An admin's vote is accepted but deliberately not counted, same
      // exclusion analytics applies to their pageviews - the server says so
      // rather than the button pretending it worked.
      if (result.ignored === 'admin') {
        setFailed(true);
      } else {
        onVoted({ score: result.score, myVote: result.myVote });
      }
    } catch {
      setFailed(true);
    }
    setBusy(false);
  }

  return (
    <div className="build-vote-bar">
      <button
        type="button"
        className={`build-vote build-vote-up${myVote === 1 ? ' is-active' : ''}`}
        onClick={() => cast(1)}
        disabled={busy}
        aria-pressed={myVote === 1}
        aria-label={myVote === 1 ? 'Remove your upvote' : 'Upvote this build'}
      >
        <span aria-hidden="true">▲</span>
      </button>

      <span className="build-vote-score" aria-label={`Score ${score ?? 0}`}>
        {score ?? 0}
      </span>

      <button
        type="button"
        className={`build-vote build-vote-down${myVote === -1 ? ' is-active' : ''}`}
        onClick={() => cast(-1)}
        disabled={busy}
        aria-pressed={myVote === -1}
        aria-label={myVote === -1 ? 'Remove your downvote' : 'Downvote this build'}
      >
        <span aria-hidden="true">▼</span>
      </button>

      <button type="button" className="build-report-button" onClick={onReport}>
        Report
      </button>

      {failed && <span className="build-vote-failed">Vote not counted</span>}
    </div>
  );
}
