import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmText,
  cancelText,
  cancelProps = {},
  confirmProps = {},
  variant = 'destructive',
  isLoading = false,
}) {
  const { t } = useTranslation();
  const {
    disabled: cancelDisabled,
    ...restCancelProps
  } = cancelProps;
  const {
    disabled: confirmDisabled,
    variant: confirmVariant,
    ...restConfirmProps
  } = confirmProps;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title || t('common.confirm')}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading || cancelDisabled}
            {...restCancelProps}
          >
            {cancelText || t('common.cancel')}
          </Button>
          <Button
            variant={confirmVariant || variant}
            onClick={onConfirm}
            disabled={isLoading || confirmDisabled}
            {...restConfirmProps}
          >
            {isLoading ? t('common.loading') : confirmText || t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
