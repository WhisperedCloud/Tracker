import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AlertTriangle, Info, CheckCircle2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';

// Promise-based replacements for window.confirm / window.alert:
//   const ok = await confirm({ title, message, confirmText, tone: 'danger' });
//   await alert({ title, message, children });

const DialogContext = createContext(null);

const toneIcon = {
  danger: <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />,
  info: <Info className="w-4 h-4" />,
  success: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
};

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolverRef = useRef(null);

  const open = useCallback((kind, options) => new Promise((resolve) => {
    resolverRef.current = resolve;
    setDialog({ kind, ...options });
  }), []);

  const confirm = useCallback((options) => open('confirm', options), [open]);
  const alert = useCallback((options) => open('alert', options), [open]);

  const finish = (result) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setDialog(null);
  };

  const tone = dialog?.tone || (dialog?.kind === 'confirm' ? 'danger' : 'info');

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      <Modal
        isOpen={Boolean(dialog)}
        onClose={() => finish(false)}
        size={dialog?.size || 'sm'}
        title={dialog?.title}
        icon={toneIcon[tone]}
        footer={
          dialog?.kind === 'confirm' ? (
            <>
              <Button variant="outline" onClick={() => finish(false)}>
                {dialog?.cancelText || 'Cancel'}
              </Button>
              <Button
                data-autofocus
                variant={tone === 'danger' ? 'destructive' : 'default'}
                onClick={() => finish(true)}
              >
                {dialog?.confirmText || 'Confirm'}
              </Button>
            </>
          ) : (
            <Button data-autofocus onClick={() => finish(true)}>
              {dialog?.confirmText || 'Done'}
            </Button>
          )
        }
      >
        {dialog?.message && (
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{dialog.message}</p>
        )}
        {dialog?.content && <div className={dialog?.message ? 'mt-4' : ''}>{dialog.content}</div>}
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) throw new Error('useDialog must be used within DialogProvider');
  return context;
}
