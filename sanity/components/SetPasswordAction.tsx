import { useState } from 'react';
import type { DocumentActionComponent } from 'sanity';
import { useClient } from 'sanity';
import bcrypt from 'bcryptjs';

export const setPasswordAction: DocumentActionComponent = (props) => {
  const client = useClient({ apiVersion: '2024-10-01' });
  const [busy, setBusy] = useState(false);

  return {
    label: busy ? 'Updating…' : 'Set Password',
    tone: 'caution',
    onHandle: async () => {
      if (busy) return;
      const pwd = window.prompt('Enter a new password (min 8 chars):');
      if (!pwd) return;
      if (pwd.length < 8) {
        window.alert('Password must be at least 8 characters.');
        return;
      }
      setBusy(true);
      try {
        const hash = await bcrypt.hash(pwd, 10);
        await client.patch(props.id).set({ passwordHash: hash }).commit();
        props.onComplete?.();
        window.alert('Password updated.');
      } catch (e) {
        console.error('Failed to set password', e);
        window.alert('Failed to set password');
      } finally {
        setBusy(false);
      }
    }
  };
};
