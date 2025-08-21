import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Button from '@/components/button';
import { Input } from '@components/ui/input';
import { Textarea } from '@components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { MapPin, Phone, Mail, Clock, Send } from 'lucide-react';
import { motion, useInView } from 'framer-motion';
import { useRef, useState } from 'react';

export function Contact() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.2 });

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<null | { ok: boolean; message: string }>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    const form = e.currentTarget as HTMLFormElement;
    const fd = new FormData(form);
    const payload = {
      firstName: String(fd.get('firstName') || ''),
      lastName: String(fd.get('lastName') || ''),
      email: String(fd.get('email') || ''),
      vehicle: String(fd.get('vehicle') || ''),
      message: String(fd.get('message') || '')
    };
    if (!payload.email || !payload.message) {
      setResult({ ok: false, message: 'Please provide an email and a brief message.' });
      return;
    }
    try {
      setSubmitting(true);
      setResult(null);
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setResult({ ok: true, message: data?.message || "Thanks! We'll get back to you shortly." });
        form.reset();
      } else {
        setResult({
          ok: false,
          message: data?.message || 'Something went wrong. Please try again.'
        });
      }
    } catch (err) {
      setResult({ ok: false, message: 'Network error. Please try again.' });
    } finally {
      setSubmitting(false);
    }
  }

  const contactInfo = [
    {
      icon: MapPin,
      title: 'F.A.S. Motorsports Shop',
      details: ['6161 Riverside Dr', 'Punta Gorda, FL 33982', 'By Appointment Only'],
      color: 'from-primary to-red-600'
    },
    {
      icon: Phone,
      title: 'Direct Line',
      details: ['(812) 200-9012', 'Monday - Friday: 9AM - 4PM', 'Drop-offs by Appointment'],
      color: 'from-blue-500 to-blue-600'
    },
    {
      icon: Mail,
      title: 'Email Support',
      details: [
        'builds@fasmotorsports.com',
        'sales@fasmotorsports.com',
        'support@fasmotorsports.com'
      ],
      color: 'from-green-500 to-green-600'
    },
    {
      icon: Clock,
      title: 'Business Hours',
      details: ['Monday - Friday: 9AM - 4PM', 'Weekend: Closed', 'All Services by Appointment'],
      color: 'from-purple-500 to-purple-600'
    }
  ];

  return (
    <section
      id="contact"
      className="py-24 bg-gradient-to-b from-background via-gray-900/50 to-background relative overflow-hidden"
    >
      {/* Background effects */}
      <div className="absolute inset-0 asphalt-texture"></div>
      <div className="absolute inset-0 road-lines opacity-30"></div>

      <div className="container mx-auto px-4 lg:px-6 relative z-10" ref={ref}>
        <motion.div
          className="text-center space-y-4 mb-16"
          initial={{ opacity: 0, y: 50 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={isInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <Badge
              variant="outline"
              className="mb-4 bg-primary/10 border-primary/30 text-primary px-6 py-2 text-sm font-bold tracking-widest font-ethno"
            >
              READY TO BUILD?
            </Badge>
          </motion.div>

          <motion.h2
            className="text-3xl lg:text-6xl font-black leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            <span className="block text-white font-captain">LET'S BUILD</span>
            <span className="block text-4xl lg:text-7xl font-cyber">SOMETHING</span>
            <span className="block text-primary font-borg">F.a.S.</span>
          </motion.h2>

          <motion.p
            className="text-lg text-graylight max-w-3xl mx-auto leading-relaxed font-kwajong"
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ delay: 0.6, duration: 0.6 }}
          >
            Ready to experience Fast, Aggressive, Superior performance? Contact our team of
            performance experts to discuss your custom supercharger project and unleash your
            vehicle's true potential.
          </motion.p>

          <motion.div
            className="font-borg text-accent text-sm tracking-widest"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            — YOUR HIGH PERFORMANCE JOURNEY STARTS HERE —
          </motion.div>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: -100 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 0.8, duration: 0.8 }}
          >
            <Card className="border-gray-700/50 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm shadow-2xl industrial-card">
              <CardHeader className="space-y-4">
                <CardTitle className="text-2xl font-bold text-white flex items-center space-x-3 font-ethno">
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-red-600 rounded-lg flex items-center justify-center engine-pulse">
                    <Send className="w-5 h-5 text-white" />
                  </div>
                  <span>START YOUR F.A.S. BUILD</span>
                </CardTitle>
                <CardDescription className="text-graylight font-kwajong">
                  Tell us about your performance goals and we'll engineer the perfect F.A.S.
                  solution.
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit}>
                  <div className="grid md:grid-cols-2 gap-4">
                    <motion.div
                      className="space-y-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={isInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ delay: 1, duration: 0.4 }}
                    >
                      <label
                        htmlFor="firstName"
                        className="text-sm font-bold text-graylight tracking-wide font-ethno"
                      >
                        FIRST NAME
                      </label>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="John"
                        className="bg-gray-800/50 border-gray-600/50 text-white focus:border-primary focus:ring-primary/20 font-kwajong"
                      />
                    </motion.div>
                    <motion.div
                      className="space-y-2"
                      initial={{ opacity: 0, y: 20 }}
                      animate={isInView ? { opacity: 1, y: 0 } : {}}
                      transition={{ delay: 1.1, duration: 0.4 }}
                    >
                      <label
                        htmlFor="lastName"
                        className="text-sm font-bold text-graylight tracking-wide font-ethno"
                      >
                        LAST NAME
                      </label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Doe"
                        className="bg-gray-800/50 border-gray-600/50 text-white focus:border-primary focus:ring-primary/20 font-kwajong"
                      />
                    </motion.div>
                  </div>

                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 1.2, duration: 0.4 }}
                  >
                    <label
                      htmlFor="email"
                      className="text-sm font-bold text-graylight tracking-wide font-ethno"
                    >
                      EMAIL
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="john@example.com"
                      className="bg-gray-800/50 border-gray-600/50 text-white focus:border-primary focus:ring-primary/20 font-kwajong"
                    />
                  </motion.div>

                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 1.3, duration: 0.4 }}
                  >
                    <label
                      htmlFor="vehicle"
                      className="text-sm font-bold text-graylight tracking-wide font-ethno"
                    >
                      VEHICLE & GOALS
                    </label>
                    <Input
                      id="vehicle"
                      name="vehicle"
                      placeholder="2023 Challenger Hellcat - 1200HP Target"
                      className="bg-gray-800/50 border-gray-600/50 text-white focus:border-primary focus:ring-primary/20 font-kwajong"
                    />
                  </motion.div>

                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 1.4, duration: 0.4 }}
                  >
                    <label
                      htmlFor="message"
                      className="text-sm font-bold text-graylight tracking-wide font-ethno"
                    >
                      PROJECT DETAILS
                    </label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us about your build goals, current setup, and F.A.S. performance targets..."
                      className="min-h-32 bg-gray-800/50 border-gray-600/50 text-white focus:border-primary focus:ring-primary/20 resize-none font-kwajong"
                    />
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={isInView ? { opacity: 1, y: 0 } : {}}
                    transition={{ delay: 1.5, duration: 0.4 }}
                  >
                    <button
                      type="submit"
                      aria-busy={submitting}
                      className={`w-full bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-700 text-white font-bold py-4 text-lg shadow-lg shadow-primary/25 group metallic-btn font-ethno${submitting ? ' opacity-70 cursor-not-allowed' : ''}`}
                      disabled={submitting}
                    >
                      {submitting ? 'SENDING…' : 'SEND MESSAGE'}
                      <motion.div
                        className="ml-2"
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Send className="w-5 h-5" />
                      </motion.div>
                    </button>
                  </motion.div>

                  {result && (
                    <p className={`mt-3 text-sm ${result.ok ? 'text-green-400' : 'text-red-400'}`}>
                      {result.message}
                    </p>
                  )}
                </form>
              </CardContent>
            </Card>
          </motion.div>

          {/* Contact Information */}
          <motion.div
            className="space-y-6"
            initial={{ opacity: 0, x: 100 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 1, duration: 0.8 }}
          >
            {contactInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: 1.2 + index * 0.1, duration: 0.6 }}
                  whileHover={{ scale: 1.02, y: -5 }}
                >
                  <Card className="border-gray-700/50 hover:border-gray-500 transition-all duration-300 bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-sm group industrial-card">
                    <CardContent className="p-6">
                      <div className="flex items-start space-x-4">
                        <div
                          className={`w-14 h-14 bg-gradient-to-br ${info.color} rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300 engine-pulse`}
                        >
                          <Icon className="w-7 h-7 text-white" />
                        </div>
                        <div className="space-y-2">
                          <h3 className="font-bold text-lg text-white group-hover:text-primary transition-colors duration-300 font-ethno">
                            {info.title}
                          </h3>
                          {info.details.map((detail, detailIndex) => (
                            <p
                              key={detailIndex}
                              className="text-graylight font-medium font-kwajong"
                            >
                              {detail}
                            </p>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            <motion.div
              className="mt-8 text-center font-borg text-accent text-sm tracking-widest"
              initial={{ opacity: 0 }}
              animate={isInView ? { opacity: 1 } : {}}
              transition={{ delay: 2, duration: 0.6 }}
            >
              — PROFESSIONAL CONSULTATION • CUSTOM ENGINEERING • PROVEN RESULTS —
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
