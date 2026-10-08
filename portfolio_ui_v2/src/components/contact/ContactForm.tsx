/**
 * ContactForm — the /contact conversion surface (F3-12).
 *
 * Audience north star: recruiters and freelance clients. The form IS the
 * page's signature: three oversized quiet fields on paper, mono labels in
 * the facts-ledger grammar, one ink-filled verb button. Everything else
 * stays quiet (brief §1, §3 — one signature per screen).
 *
 * Contract (docs/designs/2026-10-05-api-contract-v2.md §3.6/§4.1):
 *  - submit → submitContact POST /api/contact/ (typed client, F3-01)
 *  - 201 → confirmation surface. SMTP is GRACEFUL server-side (persisted,
 *    emailed in background) — so the copy says "saved and on its way",
 *    never a delivery guarantee, never underselling either.
 *  - 400 → server field errors render INLINE under their field (verbatim —
 *    the server already speaks the plain-verb voice: "Enter a valid email
 *    address", "Disposable email addresses are not allowed").
 *  - 429 → {detail} mirrored verbatim + plain-language limit copy.
 *  - network → retryable surface; inputs are NEVER cleared on failure
 *    (a recruiter's typed message is the most valuable text on the site).
 *
 * Brief §4.5: error/status feedback is CALM and INSTANT — full opacity,
 * zero entrance motion. The only transitions are hover/focus colors at
 * duration-fast × --motion-scale (the dial).
 */

'use client';

import { submitContact, toApiError } from '@/library/api-client';
import type { ContactPayload } from '@/library/types/api-v2';
import axios from 'axios';
import type { FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';

type FieldName = 'name' | 'email' | 'message';
type FieldErrors = Partial<Record<FieldName, string>>;

/** Server 400 keys → our three fields (contract §4.1 field map). */
const SERVER_FIELD_KEYS: Record<string, FieldName> = {
  name: 'name',
  email: 'email',
  message: 'message',
};

/** Form-level failures: rate limit, network, or an unmatched 400. */
type SubmitError =
  | { kind: 'rate-limit'; detail: string }
  | { kind: 'network'; detail: string }
  | { kind: 'rejected'; detail: string };

type Phase = 'editing' | 'sending' | 'sent';

/** Same shape as the v1 regex — matches the server's format expectations. */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/** Model constraint (ContactSubmission.name max_length=100), pre-checked. */
const NAME_MAX = 100;

/**
 * Client-side validation — the server's voice (what's wrong + how to fix),
 * no interjections. Runs before any POST; the server remains authoritative.
 */
function validate(values: ContactPayload): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.name) {
    errors.name = 'Enter your name — it\'s how the reply will be addressed.';
  } else if (values.name.length > NAME_MAX) {
    errors.name = `Names max out at ${NAME_MAX} characters — shorten this one.`;
  }
  if (!values.email) {
    errors.email = 'Enter your email address — the reply goes there.';
  } else if (!EMAIL_REGEX.test(values.email)) {
    errors.email =
      'That address doesn\'t look complete — check it reads like name@domain.com.';
  }
  if (!values.message) {
    errors.message = 'Write a message — one sentence about what you need is enough.';
  }
  return errors;
}

/** Input chassis: hairline box, paper body, accent border on focus. */
function inputClassName(invalid: boolean): string {
  return [
    'mt-2 w-full rounded-sm border bg-canvas px-4 py-3 text-body-lg text-ink',
    'transition-colors duration-fast ease-standard focus:border-accent',
    invalid ? 'border-negative' : 'border-line hover:border-muted',
  ].join(' ');
}

export default function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<SubmitError | null>(null);
  const [phase, setPhase] = useState<Phase>('editing');

  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const sentRef = useRef<HTMLDivElement>(null);

  // Success unmounts the form (and the focused button with it) — move
  // focus onto the confirmation so keyboard users land somewhere real.
  useEffect(() => {
    if (phase === 'sent') sentRef.current?.focus();
  }, [phase]);

  function clearFieldError(field: FieldName): void {
    setFieldErrors((current) => {
      if (!(field in current)) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (phase === 'sending') return;

    const values: ContactPayload = {
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
    };

    const clientErrors = validate(values);
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      setSubmitError(null);
      // Focus the FIRST invalid field — the fix starts where the error is.
      if (clientErrors.name) nameRef.current?.focus();
      else if (clientErrors.email) emailRef.current?.focus();
      else messageRef.current?.focus();
      return;
    }

    setFieldErrors({});
    setSubmitError(null);
    setPhase('sending');

    try {
      await submitContact(values);
      setPhase('sent');
      return;
    } catch (error) {
      // Classify by HTTP status BEFORE normalization (toApiError drops it).
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const apiError = toApiError(error);

      if (status === 429) {
        setSubmitError({
          kind: 'rate-limit',
          detail: apiError.detail ?? 'Too many requests, please try again later.',
        });
      } else if (status === 400) {
        const serverFields: FieldErrors = {};
        const unmatched: string[] = [];
        for (const [key, value] of Object.entries(apiError)) {
          const field = SERVER_FIELD_KEYS[key];
          const first = Array.isArray(value) ? value[0] : value;
          if (field && first) {
            serverFields[field] = first;
          } else if (first) {
            unmatched.push(first);
          }
        }
        if (Object.keys(serverFields).length > 0) {
          setFieldErrors(serverFields);
        }
        if (unmatched.length > 0 || Object.keys(serverFields).length === 0) {
          setSubmitError({
            kind: 'rejected',
            detail:
              apiError.detail ?? unmatched.join(' · ') ?? 'Invalid submission',
          });
        }
      } else {
        setSubmitError({
          kind: 'network',
          detail: apiError.detail ?? 'Network Error',
        });
      }
      setPhase('editing');
    }
  }

  function resetForAnother(): void {
    setName('');
    setEmail('');
    setMessage('');
    setFieldErrors({});
    setSubmitError(null);
    setPhase('editing');
  }

  if (phase === 'sent') {
    return (
      <div
        ref={sentRef}
        tabIndex={-1}
        role="status"
        className="max-w-[620px] rounded-md border border-line bg-surface p-6 md:p-8"
      >
        <p className="text-title-3 font-semibold tracking-[-0.005em] text-positive">
          Message sent.
        </p>
        <p className="mt-3 max-w-[66ch] text-body text-muted">
          It&apos;s saved on the server and on its way to my inbox. I read
          everything and reply to the address you gave.
        </p>
        <button
          type="button"
          onClick={resetForAnother}
          className="mt-6 font-mono text-mono-sm font-medium text-muted transition-colors duration-fast ease-standard hover:text-ink"
        >
          Write another message
        </button>
      </div>
    );
  }

  const sending = phase === 'sending';

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void handleSubmit(event);
      }}
      className="max-w-[620px]"
    >
      <div className="space-y-8">
        <div>
          <label htmlFor="contact-name" className="font-mono text-mono-sm text-muted">
            Name
          </label>
          <input
            ref={nameRef}
            id="contact-name"
            name="name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              clearFieldError('name');
            }}
            aria-invalid={fieldErrors.name ? true : undefined}
            aria-describedby={fieldErrors.name ? 'contact-name-error' : undefined}
            className={inputClassName(Boolean(fieldErrors.name))}
          />
          {fieldErrors.name ? (
            <p id="contact-name-error" className="mt-2 text-caption font-medium text-negative">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="contact-email" className="font-mono text-mono-sm text-muted">
            Email
          </label>
          <input
            ref={emailRef}
            id="contact-email"
            name="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              clearFieldError('email');
            }}
            aria-invalid={fieldErrors.email ? true : undefined}
            aria-describedby={fieldErrors.email ? 'contact-email-error' : undefined}
            className={inputClassName(Boolean(fieldErrors.email))}
          />
          {fieldErrors.email ? (
            <p id="contact-email-error" className="mt-2 text-caption font-medium text-negative">
              {fieldErrors.email}
            </p>
          ) : null}
        </div>

        <div>
          <label htmlFor="contact-message" className="font-mono text-mono-sm text-muted">
            Message
          </label>
          <textarea
            ref={messageRef}
            id="contact-message"
            name="message"
            rows={6}
            value={message}
            onChange={(event) => {
              setMessage(event.target.value);
              clearFieldError('message');
            }}
            aria-invalid={fieldErrors.message ? true : undefined}
            aria-describedby={fieldErrors.message ? 'contact-message-error' : undefined}
            className={[inputClassName(Boolean(fieldErrors.message)), 'resize-y'].join(' ')}
          />
          {fieldErrors.message ? (
            <p id="contact-message-error" className="mt-2 text-caption font-medium text-negative">
              {fieldErrors.message}
            </p>
          ) : null}
        </div>
      </div>

      {/* Form-level failure: calm, instant, full opacity (brief §4.5). */}
      {submitError ? (
        <div role="alert" className="mt-8 rounded-md border border-line bg-surface p-6">
          <p className="text-title-3 font-semibold tracking-[-0.005em] text-negative">
            {submitError.kind === 'rate-limit'
              ? 'Too many attempts'
              : submitError.kind === 'network'
                ? 'The message didn\u2019t send'
                : 'The message was rejected'}
          </p>
          <p className="mt-3 max-w-[66ch] text-body text-muted">
            {submitError.kind === 'rate-limit'
              ? 'Five messages a minute is the limit. Wait a moment, then send again — your text is still here.'
              : submitError.kind === 'network'
                ? 'The API didn\u2019t respond. Try again in a moment — your text is still here.'
                : 'The server didn\u2019t accept it. The detail below says why; fix what it names and send again.'}
          </p>
          <p className="mt-4 font-mono text-mono-sm text-muted">{submitError.detail}</p>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={sending}
        aria-busy={sending}
        className="mt-8 rounded-md bg-ink px-5 py-3 text-body-lg font-medium text-canvas transition-colors duration-fast ease-standard hover:bg-accent disabled:opacity-60"
      >
        {sending ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
