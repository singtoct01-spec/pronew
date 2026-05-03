export type DialogState = {
  isOpen: boolean;
  type: 'alert' | 'confirm';
  message: string;
  resolve: (value: boolean) => void;
};

let dialogListener: ((state: DialogState) => void) | null = null;

export const setDialogListener = (listener: ((state: DialogState) => void) | null) => {
  dialogListener = listener;
};

export const getDialogListener = () => dialogListener;

export const uiConfirm = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    if (dialogListener) {
      dialogListener({ isOpen: true, type: 'confirm', message, resolve });
    } else {
      resolve(window.confirm(message));
    }
  });
};

export const uiAlert = (message: string): Promise<void> => {
  return new Promise((resolve) => {
    if (dialogListener) {
      dialogListener({ isOpen: true, type: 'alert', message, resolve: () => resolve(undefined) });
    } else {
      window.alert(message);
      resolve();
    }
  });
};
