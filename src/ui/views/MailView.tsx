import { getMailTemplate } from '../../core';
import type { Action, GameState, Mail } from '../../core';
import { rewardText } from '../format';

export function MailView({ state, act }: { state: GameState; act: (a: Action) => void }) {
  const inbox = [...state.mail.inbox].reverse();
  const pending = inbox.filter((m) => !m.claimed).length;

  return (
    <>
      <div className="spread">
        <h2>郵件</h2>
        {pending > 0 && (
          <button className="btn" onClick={() => act({ type: 'claimAllMail' })}>
            全部領取（{pending}）
          </button>
        )}
      </div>
      <p className="muted lead">不定時會有禮物寄來，記得回來看看。</p>
      {inbox.length === 0 ? (
        <div className="empty">信箱空空的，過幾天再來看看吧。</div>
      ) : (
        <ul className="mail-list">
          {inbox.map((m) => (
            <MailCard key={m.id} mail={m} onClaim={() => act({ type: 'claimMail', mailId: m.id })} />
          ))}
        </ul>
      )}
    </>
  );
}

function MailCard({ mail, onClaim }: { mail: Mail; onClaim: () => void }) {
  const t = getMailTemplate(mail.templateId);
  if (!t) return null;
  return (
    <li className={`mail-card${mail.claimed ? ' claimed' : ''}`}>
      <div className="spread">
        <strong>{t.title}</strong>
        <span className="small muted">
          {t.from}・第 {mail.receivedDay} 天
        </span>
      </div>
      <p className="mail-body">{t.body}</p>
      {t.rewards.length > 0 && (
        <div className="mail-foot">
          <ul className="mail-rewards" aria-label="附件">
            {t.rewards.map((r, i) => (
              <li key={i}>🎁 {rewardText(r)}</li>
            ))}
          </ul>
          <button className="btn small" disabled={mail.claimed} onClick={onClaim}>
            {mail.claimed ? '已領取' : '領取'}
          </button>
        </div>
      )}
    </li>
  );
}
