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
            <a className="text-accent underline underline-offset-2" href="https://developer.hypixel.net/dashboard" target="_blank" rel="noreferrer">
              developer.hypixel.net
            </a>{' '}
            and create a key.
          </li>
          <li>
            Copy <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-sm">.env.example</code> to{' '}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-sm">.env</code> and paste it after{' '}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-sm">HYPIXEL_API_KEY=</code>
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
    <section className="mt-12 max-w-2xl rounded-xl border border-line bg-surface p-6 shadow-panel sm:p-8" role="alert">
      <div className="flex items-start gap-4">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted">
          <Icon size={20} />
        </span>
        <div className="min-w-0 leading-relaxed text-muted">
          <h1 className="text-xl font-semibold tracking-tight text-text">{title}</h1>
          <div className="mt-2">{children}</div>
        </div>
      </div>
    </section>
  );
}

function RetryButton({ onRetry }) {
  return (
    <button
      type="button"
      onClick={onRetry}
      className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg border border-line px-4 font-medium text-text transition-colors hover:border-accent active:scale-[0.98]"
    >
      <ArrowClockwiseIcon size={16} />
      Try again
    </button>
  );
}
