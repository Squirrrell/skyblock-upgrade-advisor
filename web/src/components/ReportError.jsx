import { ArrowClockwiseIcon, KeyIcon, UserIcon, WarningIcon } from '@phosphor-icons/react';
import { STATIC_MODE } from '../lib/api.js';

export default function ReportError({ error, player, onRetry }) {
  const code = error?.code;

  if ((code === 'NO_API_KEY' || code === 'BAD_API_KEY') && STATIC_MODE) {
    return (
      <Panel icon={KeyIcon} title="Profile lookups are down">
        <p>{error.message} The site owner needs to set or renew the Hypixel API key on the lookup proxy.</p>
        <RetryButton onRetry={onRetry} />
      </Panel>
    );
  }

  if (code === 'NO_API_KEY' || code === 'BAD_API_KEY') {
    return (
      <Panel icon={KeyIcon} title={code === 'NO_API_KEY' ? 'The server needs a Hypixel API key' : 'Hypixel rejected the API key'}>
        <p>Profile data needs a key from the Hypixel developer dashboard. Prices work without one.</p>
        <ol className="mt-4 list-decimal space-y-2 pl-5">
          <li>
            Sign in at{' '}
            <a className="mc-link" href="https://developer.hypixel.net/dashboard" target="_blank" rel="noreferrer">
              developer.hypixel.net
            </a>{' '}
            and create a key.
          </li>
          <li>
            Copy <code className="mc-readout text-sm">.env.example</code> to <code className="mc-readout text-sm">.env</code> and paste it after{' '}
            <code className="mc-readout text-sm">HYPIXEL_API_KEY=</code>
          </li>
          <li>Restart the server.</li>
        </ol>
        <RetryButton onRetry={onRetry} />
      </Panel>
    );
  }

  if (code === 'NO_PLAYER' || code === 'NO_PROFILES') {
    return (
      <Panel icon={UserIcon} title={code === 'NO_PLAYER' ? `No player called "${player}"` : 'No SkyBlock profiles'}>
        <p>{error.message} Check the spelling, or try their UUID.</p>
      </Panel>
    );
  }

  return (
    <Panel icon={WarningIcon} title={code === 'RATE_LIMIT' ? 'Too many lookups' : 'That lookup failed'}>
      <p>{error?.message ?? 'Something went wrong.'}</p>
      <RetryButton onRetry={onRetry} />
    </Panel>
  );
}

function Panel({ icon: Icon, title, children }) {
  return (
    <section className="mc-panel mt-12 max-w-2xl p-6 sm:p-8" role="alert">
      <div className="flex items-start gap-4">
        <span className="mc-slot shrink-0 text-[var(--code-white)]">
          <Icon size={20} />
        </span>
        <div className="min-w-0 leading-relaxed text-muted">
          <h1 className="text-xl font-bold text-text">{title}</h1>
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </section>
  );
}

function RetryButton({ onRetry }) {
  return (
    <button type="button" onClick={onRetry} className="mc-btn mt-6">
      <ArrowClockwiseIcon size={16} />
      Try again
    </button>
  );
}
