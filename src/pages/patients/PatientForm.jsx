import { useEffect, useMemo } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { patientSchema } from '@/lib/validators';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';
import { SearchableSelect } from '@/components/common/SearchableSelect';
import { useSessionCategories } from '@/hooks/useSessions';

const defaultValues = {
  fullName: '',
  age: undefined,
  phone: '',
  job: '',
  address: '',
  referral: '',
  homeBranchId: undefined,
  categoryId: undefined,
  defaultSessionCost: undefined,
  reassessmentCycleLength: undefined,
};

export function PatientForm({
  initialValues = defaultValues,
  onSubmit,
  onCancel,
  isSubmitting,
  isEditing,
  showDefaultSessionCost = true,
  branchOptions = [],
}) {
  const { t } = useTranslation();
  const categoriesQuery = useSessionCategories();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(patientSchema),
    defaultValues: { ...defaultValues, ...initialValues },
  });

  const categories = useMemo(() => {
    const data = categoriesQuery.data;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.categories)) return data.categories;
    return [];
  }, [categoriesQuery.data]);

  const categoryOptions = useMemo(
    () =>
      categories.map((c) => ({
        value: String(c.id),
        label: c.name,
      })),
    [categories]
  );

  useEffect(() => {
    reset({ ...defaultValues, ...initialValues });
  }, [initialValues, reset]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEditing ? t('patients.editPatient') : t('patients.createPatient')}
        </CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t('patients.fullName')}</Label>
            <Input id="fullName" {...register('fullName')} disabled={isSubmitting} />
            {errors.fullName && (
              <p className="text-sm text-destructive">{errors.fullName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="age">{t('patients.age')}</Label>
            <Input
              id="age"
              type="number"
              {...register('age', { valueAsNumber: true })}
              disabled={isSubmitting}
            />
            {errors.age && <p className="text-sm text-destructive">{errors.age.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">{t('patients.phone')}</Label>
            <Input id="phone" type="tel" {...register('phone')} disabled={isSubmitting} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="job">{t('patients.job', { defaultValue: 'Job' })}</Label>
            <Input id="job" {...register('job')} disabled={isSubmitting} />
            {errors.job && <p className="text-sm text-destructive">{errors.job.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t('patients.address')}</Label>
            <Input id="address" {...register('address')} disabled={isSubmitting} />
            {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="referral">{t('patients.referral', { defaultValue: 'Referral' })}</Label>
            <Input id="referral" {...register('referral')} disabled={isSubmitting} />
            {errors.referral && <p className="text-sm text-destructive">{errors.referral.message}</p>}
          </div>

          {branchOptions.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="homeBranchId">
                {t('patients.homeBranch', { defaultValue: 'Home branch' })}
              </Label>
              <Controller
                name="homeBranchId"
                control={control}
                render={({ field }) => (
                  <SearchableSelect
                    options={branchOptions}
                    value={field.value ? String(field.value) : ''}
                    onChange={(val) => field.onChange(val ? Number(val) : undefined)}
                    placeholder={t('patients.homeBranch', {
                      defaultValue: 'Select home branch',
                    })}
                    disabled={isSubmitting}
                  />
                )}
              />
              {errors.homeBranchId && (
                <p className="text-sm text-destructive">{errors.homeBranchId.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="categoryId">{t('patients.category', { defaultValue: 'Category' })}</Label>
            <Controller
              name="categoryId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  options={categoryOptions}
                  value={field.value ? String(field.value) : ''}
                  onChange={(val) => field.onChange(val ? Number(val) : undefined)}
                  placeholder={t('patients.categoryPlaceholder', {
                    defaultValue: 'Select category',
                  })}
                  disabled={isSubmitting || categoriesQuery.isLoading}
                />
              )}
            />
            {errors.categoryId && (
              <p className="text-sm text-destructive">{errors.categoryId.message}</p>
            )}
          </div>

          {showDefaultSessionCost && (
            <div className="space-y-2">
              <Label htmlFor="defaultSessionCost">
                {t('patients.defaultSessionCost', { defaultValue: 'Default session cost' })}
              </Label>
              <Input
                id="defaultSessionCost"
                type="number"
                step="1"
                min="0"
                {...register('defaultSessionCost', { valueAsNumber: true })}
                disabled={isSubmitting}
              />
              {errors.defaultSessionCost && (
                <p className="text-sm text-destructive">{errors.defaultSessionCost.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reassessmentCycleLength">
              {t('patients.reassessmentCycleLength', {
                defaultValue: 'Reassessment cycle length',
              })}
            </Label>
            <Input
              id="reassessmentCycleLength"
              type="number"
              step="1"
              min="0"
              {...register('reassessmentCycleLength', { valueAsNumber: true })}
              disabled={isSubmitting}
            />
            {errors.reassessmentCycleLength && (
              <p className="text-sm text-destructive">{errors.reassessmentCycleLength.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-2">
          {isEditing && (
            <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t('common.loading') : t('common.save')}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
