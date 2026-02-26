// __tests__/unit/components/ContactForm.test.tsx
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: { success: jest.fn(), error: jest.fn() },
  Toaster: () => null,
}));

// Mock api client
const mockPost = jest.fn();
jest.mock('@/library/api-client', () => ({
  api: { post: (...args: unknown[]) => mockPost(...args) },
}));

import ContactForm from '@/components/ContactForm';

const fillAndSubmitForm = async (
  name = 'Alice',
  email = 'alice@gmail.com',
  message = 'Hello!'
) => {
  fireEvent.change(screen.getByLabelText(/name/i), {
    target: { name: 'name', value: name },
  });
  fireEvent.change(screen.getByLabelText(/email/i), {
    target: { name: 'email', value: email },
  });
  fireEvent.change(screen.getByLabelText(/message/i), {
    target: { name: 'message', value: message },
  });
  const form = screen.getByRole('button', { name: /send message/i }).closest('form');
  fireEvent.submit(form!);
};

describe('ContactForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPost.mockResolvedValue({});
  });

  it('renders all form fields', () => {
    render(<ContactForm />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/message/i)).toBeInTheDocument();
  });

  it('renders a submit button', () => {
    render(<ContactForm />);
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('shows email validation error for invalid email format', async () => {
    render(<ContactForm />);
    await fillAndSubmitForm('Alice', 'not-an-email', 'Hi');
    await waitFor(() => {
      expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument();
    });
  });

  it('shows email validation error for example.com domain', async () => {
    render(<ContactForm />);
    await fillAndSubmitForm('Bob', 'bob@example.com', 'Hi');
    await waitFor(() => {
      expect(screen.getByText(/please use your actual email address/i)).toBeInTheDocument();
    });
  });

  it('calls api.post with correct data on valid submission', async () => {
    render(<ContactForm />);
    await fillAndSubmitForm();
    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith(
        '/contact/',
        expect.objectContaining({ name: 'Alice', email: 'alice@gmail.com', message: 'Hello!' })
      );
    });
  });

  it('does not call api.post when email is invalid', async () => {
    render(<ContactForm />);
    await fillAndSubmitForm('Alice', 'bad-email', 'Hi');
    await waitFor(() => {
      expect(mockPost).not.toHaveBeenCalled();
    });
  });

  it('clears form fields after successful submission', async () => {
    render(<ContactForm />);
    await fillAndSubmitForm();
    await waitFor(() => {
      expect(screen.getByLabelText(/name/i)).toHaveValue('');
      expect(screen.getByLabelText(/email/i)).toHaveValue('');
      expect(screen.getByLabelText(/message/i)).toHaveValue('');
    });
  });

  it('shows toast error on api failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('Network error'));
    const { toast } = require('sonner');
    render(<ContactForm />);
    await fillAndSubmitForm('Alice', 'good@valid.com', 'Hi');
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
