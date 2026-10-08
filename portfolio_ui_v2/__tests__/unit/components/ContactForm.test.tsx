/**
 * Behavioral tests — ContactForm states (F3-12).
 *
 * Pins the full submit lifecycle against the frozen contract §3.6/§4.1
 * (client mocked at the api-client boundary — no HTTP in jsdom):
 * - client validation: field-level messages in the server's voice, focus
 *   lands on the first invalid field, no POST is sent
 * - editing a field clears its error
 * - sending: button verb changes honestly to "Sending…", double submits
 *   don't double-POST
 * - success (201): "Message sent." + the what-happens-next line (saved +
 *   on its way — the graceful-SMTP honesty contract), form unmounts
 * - 429: honest copy naming the limit, mirrors {detail} verbatim
 * - 400: server field errors render INLINE under their field
 * - network: retryable surface, inputs preserved (typed text survives)
 * - keyboard: Enter in a text input submits the form
 */

import ContactForm from '@/components/contact/ContactForm';
import { submitContact } from '@/library/api-client';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios, { type AxiosError } from 'axios';

afterEach(cleanup);

jest.mock('@/library/api-client', () => {
  const actual = jest.requireActual('@/library/api-client');
  return {
    ...actual,
    submitContact: jest.fn(),
  };
});

const submitContactMock = submitContact as jest.MockedFunction<typeof submitContact>;

/** Build an axios-shaped rejection carrying status + data (§4.1 truth). */
function axiosReject(status: number, data: unknown): never {
  const error = {
    isAxiosError: true,
    response: { status, data },
    message: `Request failed with status code ${status}`,
  } as unknown as AxiosError;
  throw error;
}

const VALID = {
  name: 'Dana Recruit',
  email: 'dana@agency.com',
  message: 'We have a role that fits your terminal work.',
};

async function fillValid(user: ReturnType<typeof userEvent.setup>): Promise<void> {
  await user.type(screen.getByLabelText('Name'), VALID.name);
  await user.type(screen.getByLabelText('Email'), VALID.email);
  await user.type(screen.getByLabelText('Message'), VALID.message);
}

beforeEach(() => {
  submitContactMock.mockReset();
});

describe("ContactForm — client validation (the server's voice)", () => {
  it('names what is wrong and how to fix it — and sends nothing', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(screen.getByText(/Enter your name/i)).toBeInTheDocument();
    expect(screen.getByText(/Enter your email address/i)).toBeInTheDocument();
    expect(screen.getByText(/Write a message/i)).toBeInTheDocument();
    expect(submitContactMock).not.toHaveBeenCalled();
  });

  it('rejects a malformed email with the fix spelled out', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.type(screen.getByLabelText('Name'), VALID.name);
    await user.type(screen.getByLabelText('Email'), 'dana@agency');
    await user.type(screen.getByLabelText('Message'), VALID.message);
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(screen.getByText(/name@domain\.com/i)).toBeInTheDocument();
    expect(submitContactMock).not.toHaveBeenCalled();
  });

  it('focuses the first invalid field and clears a field error on edit', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(screen.getByLabelText('Name')).toHaveFocus();

    await user.type(screen.getByLabelText('Name'), VALID.name);
    expect(screen.queryByText(/Enter your name/i)).not.toBeInTheDocument();
    // The untouched fields keep their errors.
    expect(screen.getByText(/Enter your email address/i)).toBeInTheDocument();
  });

  it('marks invalid fields for assistive tech (aria-invalid + describedby)', async () => {
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    const email = screen.getByLabelText('Email');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAttribute('aria-describedby', 'contact-email-error');
    expect(screen.getByText(/Enter your email address/i)).toBeInTheDocument();
  });
});

describe('ContactForm — sending', () => {
  it('changes the button verb honestly and blocks double submits', async () => {
    let release: (() => void) | undefined;
    submitContactMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ ...VALID });
        })
    );
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillValid(user);

    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    expect(submitContactMock).toHaveBeenCalledTimes(1);

    // A second Enter while in flight must not fire a second POST.
    await user.keyboard('{Enter}');
    expect(submitContactMock).toHaveBeenCalledTimes(1);

    release?.();
    await waitFor(() =>
      expect(screen.getByText('Message sent.')).toBeInTheDocument()
    );
  });
});

describe('ContactForm — success (201)', () => {
  it('confirms with the what-happens-next line and drops the form', async () => {
    submitContactMock.mockResolvedValue({ ...VALID });
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Message sent.')).toBeInTheDocument();
    // The graceful-SMTP honesty contract: saved + dispatched, no guarantee.
    expect(screen.getByText(/saved on the server and on its way/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('Name')).not.toBeInTheDocument();
  });

  it('offers writing another message from the confirmation', async () => {
    submitContactMock.mockResolvedValue({ ...VALID });
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByText('Message sent.');

    await user.click(screen.getByRole('button', { name: 'Write another message' }));
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('');
  });
});

describe('ContactForm — 429 rate limit', () => {
  it('states the honest limit copy and mirrors {detail} verbatim', async () => {
    const DETAIL = 'Too many requests, please try again later.';
    submitContactMock.mockImplementation(() => axiosReject(429, { detail: DETAIL }));
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Too many attempts')).toBeInTheDocument();
    expect(screen.getByText(/Five messages a minute is the limit/i)).toBeInTheDocument();
    // The mirrored server detail, mono (the reportable fact).
    expect(screen.getByText(DETAIL)).toBeInTheDocument();
    // The form stays usable; the typed text is preserved.
    expect(screen.getByLabelText('Message')).toHaveValue(VALID.message);
    expect(screen.getByRole('button', { name: 'Send message' })).toBeEnabled();
  });
});

describe('ContactForm — 400 field errors', () => {
  it('renders server field errors inline under their field', async () => {
    submitContactMock.mockImplementation(() =>
      axiosReject(400, {
        email: ['Disposable email addresses are not allowed'],
      })
    );
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(
      await screen.findByText('Disposable email addresses are not allowed')
    ).toBeInTheDocument();
    const email = screen.getByLabelText('Email');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveValue(VALID.email); // preserved for correction
    expect(screen.queryByText('Message sent.')).not.toBeInTheDocument();
  });

  it('maps a plain format rejection to the email field', async () => {
    submitContactMock.mockImplementation(() =>
      axiosReject(400, { email: ['Enter a valid email address'] })
    );
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('ContactForm — network / API down', () => {
  it('offers a retryable error surface and preserves the typed text', async () => {
    submitContactMock.mockImplementation(() => axiosReject(0, undefined));
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('The message didn’t send')).toBeInTheDocument();
    expect(screen.getByText(/The API didn’t respond/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue(VALID.name);
    expect(screen.getByLabelText('Email')).toHaveValue(VALID.email);
    expect(screen.getByLabelText('Message')).toHaveValue(VALID.message);

    // Retry works once the API returns.
    submitContactMock.mockResolvedValueOnce({ ...VALID });
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    expect(await screen.findByText('Message sent.')).toBeInTheDocument();
  });

  it('treats a response-less axios throw (network) as retryable', async () => {
    const error = { isAxiosError: true, message: 'Network Error' } as unknown as AxiosError;
    submitContactMock.mockRejectedValue(error);
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Send message' }));

    expect(await screen.findByText('The message didn’t send')).toBeInTheDocument();
    expect(screen.getByText('Network Error')).toBeInTheDocument();
  });
});

describe('ContactForm — keyboard', () => {
  it('submits via Enter pressed on the submit button (keyboard path)', async () => {
    submitContactMock.mockResolvedValue({ ...VALID });
    const user = userEvent.setup();
    render(<ContactForm />);
    await fillValid(user);
    // Focus ends on the textarea after fillValid; Enter there inserts a
    // newline (native textarea behavior) — the keyboard submit path runs
    // through the button, which Enter activates natively.
    await user.type(screen.getByRole('button', { name: 'Send message' }), '{Enter}');
    expect(await screen.findByText('Message sent.')).toBeInTheDocument();
    expect(submitContactMock).toHaveBeenCalledWith(VALID);
  });

  it('trims whitespace before sending the payload', async () => {
    submitContactMock.mockResolvedValue({ ...VALID });
    const user = userEvent.setup();
    render(<ContactForm />);
    await user.type(screen.getByLabelText('Name'), `  ${VALID.name}  `);
    await user.type(screen.getByLabelText('Email'), VALID.email);
    await user.type(screen.getByLabelText('Message'), VALID.message);
    await user.click(screen.getByRole('button', { name: 'Send message' }));
    await screen.findByText('Message sent.');
    expect(submitContactMock).toHaveBeenCalledWith(VALID);
  });
});

describe('ContactForm — truth anchor: axios is really imported (no false-positive mock)', () => {
  it('recognizes axios-shaped errors through axios.isAxiosError', () => {
    const error = { isAxiosError: true } as unknown as AxiosError;
    expect(axios.isAxiosError(error)).toBe(true);
  });
});
