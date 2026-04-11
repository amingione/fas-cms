import { useState, type FormEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';

interface PackageInquiryDialogProps {
  packageName: string;
  buttonText?: string;
  buttonClass?: string;
}

export default function PackageInquiryDialog({
  packageName,
  buttonText = 'Request Consultation',
  buttonClass = 'btn-pkg-ghost'
}: PackageInquiryDialogProps) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setStatus(null);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // Add package name to form data
    formData.append('package', packageName);

    try {
      const res = await fetch('/api/package-inquiry', {
        method: 'POST',
        body: formData
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setStatus({
          type: 'success',
          message: data.message || 'Your inquiry has been submitted! We will be in touch soon.'
        });
        form.reset();
        // Close dialog after 2 seconds
        setTimeout(() => {
          setOpen(false);
          setStatus(null);
        }, 2000);
      } else {
        setStatus({
          type: 'error',
          message: data.message || 'Failed to submit inquiry. Please try again.'
        });
      }
    } catch (err) {
      setStatus({
        type: 'error',
        message: 'Network error. Please check your connection and try again.'
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonClass}>{buttonText}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-zinc-900 border-zinc-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-2xl font-ethno text-primary">
            {packageName} Consultation Request
          </DialogTitle>
          <DialogDescription className="text-white/60">
            Fill out the form below and our team will reach out to discuss your build, answer
            questions, and provide pricing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Contact Information
            </h3>

            <div>
              <label htmlFor="pkg-name" className="block text-sm text-white/70 mb-1">
                Name <span className="text-primary">*</span>
              </label>
              <input
                type="text"
                id="pkg-name"
                name="name"
                required
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pkg-email" className="block text-sm text-white/70 mb-1">
                  Email <span className="text-primary">*</span>
                </label>
                <input
                  type="email"
                  id="pkg-email"
                  name="email"
                  required
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="pkg-phone" className="block text-sm text-white/70 mb-1">
                  Phone <span className="text-primary">*</span>
                </label>
                <input
                  type="tel"
                  id="pkg-phone"
                  name="phone"
                  required
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          <div className="space-y-4 pt-4 border-t border-zinc-700">
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Vehicle Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="pkg-year" className="block text-sm text-white/70 mb-1">
                  Year <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  id="pkg-year"
                  name="vehicleYear"
                  required
                  placeholder="2021"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="pkg-make" className="block text-sm text-white/70 mb-1">
                  Make <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  id="pkg-make"
                  name="vehicleMake"
                  required
                  placeholder="Dodge"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="pkg-model" className="block text-sm text-white/70 mb-1">
                  Model <span className="text-primary">*</span>
                </label>
                <input
                  type="text"
                  id="pkg-model"
                  name="vehicleModel"
                  required
                  placeholder="Challenger Hellcat"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <label htmlFor="pkg-current-setup" className="block text-sm text-white/70 mb-1">
                Current Setup/Mods <span className="text-white/40">(optional)</span>
              </label>
              <textarea
                id="pkg-current-setup"
                name="currentSetup"
                rows={3}
                placeholder="List any current modifications, upgrades, or relevant build details..."
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              ></textarea>
            </div>
          </div>

          {/* Goals & Questions */}
          <div className="space-y-4 pt-4 border-t border-zinc-700">
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Your Goals
            </h3>

            <div>
              <label htmlFor="pkg-goals" className="block text-sm text-white/70 mb-1">
                Power Goals & Questions <span className="text-primary">*</span>
              </label>
              <textarea
                id="pkg-goals"
                name="goals"
                rows={4}
                required
                placeholder="What are you trying to achieve? Target horsepower? Intended use (street, track, both)? Timeline? Any specific questions?"
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              ></textarea>
            </div>
          </div>

          {/* Contact Preferences */}
          <div className="space-y-4 pt-4 border-t border-zinc-700">
            <h3 className="text-sm font-semibold text-white/80 uppercase tracking-wider">
              Contact Preferences
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pkg-contact-method" className="block text-sm text-white/70 mb-1">
                  Preferred Contact Method
                </label>
                <select
                  id="pkg-contact-method"
                  name="contactMethod"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="phone">Phone</option>
                  <option value="email">Email</option>
                  <option value="either">Either</option>
                </select>
              </div>

              <div>
                <label htmlFor="pkg-best-time" className="block text-sm text-white/70 mb-1">
                  Best Time to Call <span className="text-white/40">(optional)</span>
                </label>
                <input
                  type="text"
                  id="pkg-best-time"
                  name="bestTime"
                  placeholder="e.g., Weekday afternoons"
                  className="w-full px-4 py-2 bg-zinc-800 border border-zinc-600 rounded text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Status Message */}
          {status && (
            <div
              className={`mt-4 p-4 rounded border ${
                status.type === 'success'
                  ? 'bg-green-500/10 border-green-500/50 text-green-200'
                  : 'bg-red-500/10 border-red-500/50 text-red-200'
              }`}
            >
              {status.message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={busy}
            className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-white font-semibold px-6 py-3 rounded uppercase tracking-wider transition-colors duration-200"
          >
            {busy ? 'Submitting...' : 'Submit Inquiry'}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
