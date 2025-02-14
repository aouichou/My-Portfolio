// src/components/ContactForm.tsx

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api-client';
import { toast } from 'sonner';

export default function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await api.post('/contact/', formData);
      toast.success('Message Sent!', {
        description: "Thank you for reaching out. I'll respond shortly.",
      });
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      toast.error('Error', {
        description: "Failed to send message. Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="contact" className="py-20 bg-gray-50 dark:bg-gray-800">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-4xl font-bold mb-12 text-center dark:text-white">
            Let's Connect
          </h2>
          <form
            onSubmit={handleSubmit}
            className="max-w-lg mx-auto space-y-6"
          >
            {/* Existing form fields */}
            
            <button
              type="submit"
              className="w-full btn-primary disabled:opacity-50"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        </motion.div>
      </div>
    </section>
  );
}