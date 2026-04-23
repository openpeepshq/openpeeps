import * as React from 'react';
import {
  Controller,
  ControllerProps,
  FieldPath,
  FieldValues,
  FormProvider,
  Noop,
  useFormContext,
} from 'react-hook-form';
import { TouchableWithoutFeedback, View } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import {
  BottomSheet,
  BottomSheetCloseTrigger,
  BottomSheetContent,
  BottomSheetOpenTrigger,
  BottomSheetView,
} from '~/components/ui/bottom-sheet';
import { Button, buttonTextVariants } from '~/components/ui/button';
import { Calendar } from '~/components/ui/calendar';
import { Combobox, ComboboxOption } from '~/components/ui/combobox';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { RadioGroup } from '~/components/ui/radio-group';
import {
  RenderSelectItem,
  Select,
  SelectItem,
  SelectList,
  type SelectOption,
  type SelectProps,
  SelectTrigger,
} from '~/components/custom/common/select';
import { Switch } from '~/components/ui/switch';
import { Textarea } from '~/components/ui/textarea';
import { XIcon, CalendarIcon } from '~/components/icons';
import { cn } from '~/lib/utils';
import type { DateData } from 'react-native-calendars';
import { Checkbox } from '~/components/ui/checkbox';
import { ThemedText } from './themed-text';

const Form = FormProvider;

type FormFieldContextValue<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
> = {
  name: TName;
};

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
);

const FormField = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>,
>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  return (
    <FormFieldContext.Provider value={{ name: props.name }}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const useFormField = () => {
  const fieldContext = React.useContext(FormFieldContext);
  const itemContext = React.useContext(FormItemContext);
  const { getFieldState, formState, handleSubmit } = useFormContext();

  const fieldState = getFieldState(fieldContext.name, formState);

  if (!fieldContext) {
    throw new Error('useFormField should be used within <FormField>');
  }

  const { nativeID } = itemContext;

  return {
    nativeID,
    name: fieldContext.name,
    formItemNativeID: `${nativeID}-form-item`,
    formDescriptionNativeID: `${nativeID}-form-item-description`,
    formMessageNativeID: `${nativeID}-form-item-message`,
    handleSubmit,
    ...fieldState,
  };
};

type FormItemContextValue = {
  nativeID: string;
};

const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
);

const FormItem = React.forwardRef<
  React.ElementRef<typeof View>,
  React.ComponentPropsWithoutRef<typeof View>
>(({ className, ...props }, ref) => {
  const nativeID = React.useId();

  return (
    <FormItemContext.Provider value={{ nativeID }}>
      <View ref={ref} className={cn('space-y-2', className)} {...props} />
    </FormItemContext.Provider>
  );
});
FormItem.displayName = 'FormItem';

const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => {
  const { error, formItemNativeID } = useFormField();

  return (
    <Label
      ref={ref}
      className={cn(
        error && 'text-destructive',
        'text-muted-foreground',
        className,
      )}
      nativeID={formItemNativeID}
      {...props}
    />
  );
});
FormLabel.displayName = 'FormLabel';

const FormDescription = React.forwardRef<
  React.ElementRef<typeof ThemedText>,
  React.ComponentPropsWithoutRef<typeof ThemedText>
>(({ className, ...props }, ref) => {
  const { formDescriptionNativeID } = useFormField();

  return (
    <ThemedText
      ref={ref}
      nativeID={formDescriptionNativeID}
      className={cn('text-sm text-muted-foreground pt-1', className)}
      {...props}
    />
  );
});
FormDescription.displayName = 'FormDescription';

const FormMessage = React.forwardRef<
  React.ElementRef<typeof Animated.Text>,
  React.ComponentPropsWithoutRef<typeof Animated.Text>
>(({ className, children, ...props }, ref) => {
  const { error, formMessageNativeID } = useFormField();
  const body = error ? String(error?.message) : children;

  if (!body) {
    return null;
  }

  return (
    <Animated.Text
      entering={FadeInDown}
      exiting={FadeOut.duration(275)}
      ref={ref}
      nativeID={formMessageNativeID}
      className={cn('text-sm font-medium text-destructive', className)}
      {...props}>
      {body}
    </Animated.Text>
  );
});
FormMessage.displayName = 'FormMessage';

type Override<T, U> = Omit<T, keyof U> & U;

interface FormFieldFieldProps<T> {
  name: string;
  onBlur: Noop;
  onChange: (val: T) => void;
  value: T;
  disabled?: boolean;
}

type FormItemProps<T extends React.ElementType, U> = Override<
  React.ComponentPropsWithoutRef<T>,
  FormFieldFieldProps<U>
> & {
  label?: string;
  description?: string;
  custom?: boolean;
  containerClassName?: string;
  handleOnLabelPress?: () => void;
};

const FormInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  FormItemProps<typeof Input, string | undefined>
>(({ label, description, onChange, containerClassName, ...props }, ref) => {
  const inputRef = React.useRef<React.ComponentRef<typeof Input>>(null);
  const {
    error,
    formItemNativeID,
    formDescriptionNativeID,
    formMessageNativeID,
  } = useFormField();

  React.useImperativeHandle(
    ref,
    () => {
      if (!inputRef.current) {
        return {} as React.ComponentRef<typeof Input>;
      }
      return inputRef.current;
    },
    [inputRef],
  );

  function handleOnLabelPress() {
    if (!inputRef.current) {
      return;
    }
    if (inputRef.current.isFocused()) {
      inputRef.current?.blur();
    } else {
      inputRef.current?.focus();
    }
  }

  return (
    <FormItem className={containerClassName}>
      {!!label && (
        <FormLabel nativeID={formItemNativeID} onPress={handleOnLabelPress}>
          {label}
        </FormLabel>
      )}

      <Input
        ref={inputRef}
        aria-labelledby={formItemNativeID}
        aria-describedby={
          !error
            ? `${formDescriptionNativeID}`
            : `${formDescriptionNativeID} ${formMessageNativeID}`
        }
        aria-invalid={!!error}
        onChangeText={onChange}
        {...props}
      />
      {!!description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
});

FormInput.displayName = 'FormInput';

const FormTextarea = React.forwardRef<
  React.ElementRef<typeof Textarea>,
  FormItemProps<typeof Textarea, string | undefined>
>(({ label, description, onChange, containerClassName, ...props }, ref) => {
  const textareaRef = React.useRef<React.ComponentRef<typeof Textarea>>(null);
  const {
    error,
    formItemNativeID,
    formDescriptionNativeID,
    formMessageNativeID,
  } = useFormField();

  React.useImperativeHandle(
    ref,
    () => {
      if (!textareaRef.current) {
        return {} as React.ComponentRef<typeof Textarea>;
      }
      return textareaRef.current;
    },
    [textareaRef],
  );

  function handleOnLabelPress() {
    if (!textareaRef.current) {
      return;
    }
    if (textareaRef.current.isFocused()) {
      textareaRef.current?.blur();
    } else {
      textareaRef.current?.focus();
    }
  }

  return (
    <FormItem className={containerClassName}>
      {!!label && (
        <FormLabel nativeID={formItemNativeID} onPress={handleOnLabelPress}>
          {label}
        </FormLabel>
      )}

      <Textarea
        ref={textareaRef}
        aria-labelledby={formItemNativeID}
        aria-describedby={
          !error
            ? `${formDescriptionNativeID}`
            : `${formDescriptionNativeID} ${formMessageNativeID}`
        }
        aria-invalid={!!error}
        onChangeText={onChange}
        {...props}
      />
      {!!description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
});

FormTextarea.displayName = 'FormTextarea';

const FormCheckbox = React.forwardRef<
  React.ElementRef<typeof Checkbox>,
  FormItemProps<typeof Checkbox, boolean | undefined>
>(
  (
    { label, custom, description, handleOnLabelPress, containerClassName, ...props },
    ref,
  ) => {
    const checkboxRef = React.useRef<React.ComponentRef<typeof Checkbox>>(null);
    const {
      error,
      formItemNativeID,
      formDescriptionNativeID,
      formMessageNativeID,
    } = useFormField();

    React.useImperativeHandle(
      ref,
      () => {
        if (!checkboxRef.current) {
          return {} as React.ComponentRef<typeof Checkbox>;
        }
        return checkboxRef.current;
      },
      [checkboxRef],
    );

    return (
      <FormItem className={cn('px-1', containerClassName)}>
        <View className="flex-row gap-3 items-center">
          <Checkbox
            ref={checkboxRef}
            aria-labelledby={formItemNativeID}
            aria-describedby={
              !error
                ? `${formDescriptionNativeID}`
                : `${formDescriptionNativeID} ${formMessageNativeID}`
            }
            aria-invalid={!!error}
            {...props}
          />
          {custom && (
            <ThemedText className="text-base absolute ml-9 tracking-wider ">
              I have read and agree to the{' '}
              <TouchableWithoutFeedback
                onPress={handleOnLabelPress}
                className="inline-flex items-center ">
                <ThemedText className=" text-base underline">
                  privacy policy
                </ThemedText>
              </TouchableWithoutFeedback>{' '}
            </ThemedText>
          )}
          {!!label && (
            <FormLabel
              nativeID={formItemNativeID}
              onPress={handleOnLabelPress}
              className="pr-3">
              {label}
            </FormLabel>
          )}
        </View>
        {!!description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
      </FormItem>
    );
  },
);

FormCheckbox.displayName = 'FormCheckbox';

const FormDatePicker = React.forwardRef<
  React.ElementRef<typeof Button>,
  FormItemProps<typeof Calendar, string>
>(({ label, description, value, onChange, containerClassName, ...props }, ref) => {
  const {
    error,
    formItemNativeID,
    formDescriptionNativeID,
    formMessageNativeID,
  } = useFormField();

  return (
    <FormItem className={containerClassName}>
      {!!label && <FormLabel nativeID={formItemNativeID}>{label}</FormLabel>}
      <BottomSheet className="mt-2">
        <BottomSheetOpenTrigger asChild>
          <Button
            variant="outline"
            className="flex-row justify-start px-4 relative"
            ref={ref}
            aria-labelledby={formItemNativeID}
            aria-describedby={
              !error
                ? `${formDescriptionNativeID}`
                : `${formDescriptionNativeID} ${formMessageNativeID}`
            }
            aria-invalid={!!error}>
            {({ pressed }) => (
              <View className="flex-row gap-3 justify-start">
                <CalendarIcon
                  className={buttonTextVariants({
                    variant: 'outline',
                    className: cn(
                      !value && 'opacity-80',
                      pressed && 'opacity-60',
                    ),
                  })}
                  size={18}
                />
                <ThemedText
                  className={buttonTextVariants({
                    variant: 'outline',
                    className: cn(
                      'font-normal',
                      !value && 'opacity-70',
                      pressed && 'opacity-50',
                    ),
                  })}>
                  {value ? value : 'Pick a date'}
                </ThemedText>
                {!!value && (
                  <Button
                    className="absolute right-0"
                    variant="ghost"
                    size="sm"
                    onPress={() => {
                      onChange?.('');
                    }}>
                    {({ pressed: buttonPressed }) => (
                      <XIcon
                        className={cn(
                          'text-muted-foreground',
                          buttonPressed && 'opacity-70',
                        )}
                      />
                    )}
                  </Button>
                )}
              </View>
            )}
          </Button>
        </BottomSheetOpenTrigger>
        <BottomSheetContent>
          <BottomSheetView hadHeader={false} className="pt-2">
            <Calendar
              style={{ height: 358 }}
              onDayPress={(day: DateData) => {
                onChange?.(day.dateString === value ? '' : day.dateString);
              }}
              markedDates={{
                [value ?? '']: {
                  selected: true,
                },
              }}
              current={value}
              {...props}
            />
            <View className={'pb-2 pt-4'}>
              <BottomSheetCloseTrigger asChild>
                <Button size="sm">
                  {({ pressed }) => (
                    <ThemedText
                      className={buttonTextVariants({
                        className: cn(pressed && 'opacity-70'),
                      })}>
                      Close
                    </ThemedText>
                  )}
                </Button>
              </BottomSheetCloseTrigger>
            </View>
          </BottomSheetView>
        </BottomSheetContent>
      </BottomSheet>
      {!!description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
});

FormDatePicker.displayName = 'FormDatePicker';

const FormRadioGroup = React.forwardRef<
  React.ElementRef<typeof RadioGroup>,
  FormItemProps<typeof RadioGroup, string>
>(({ label, description, value, containerClassName, ...props }, ref) => {
  const {
    error,
    formItemNativeID,
    formDescriptionNativeID,
    formMessageNativeID,
  } = useFormField();

  return (
    <FormItem className={cn('gap-3', containerClassName)}>
      <View>
        {!!label && <FormLabel nativeID={formItemNativeID}>{label}</FormLabel>}
        {!!description && (
          <FormDescription className="pt-0">{description}</FormDescription>
        )}
      </View>
      <RadioGroup
        ref={ref}
        aria-labelledby={formItemNativeID}
        aria-describedby={
          !error
            ? `${formDescriptionNativeID}`
            : `${formDescriptionNativeID} ${formMessageNativeID}`
        }
        aria-invalid={!!error}
        value={value}
        {...props}
      />

      <FormMessage />
    </FormItem>
  );
});

FormRadioGroup.displayName = 'FormRadioGroup';

const FormCombobox = React.forwardRef<
  React.ElementRef<typeof Combobox>,
  FormItemProps<typeof Combobox, ComboboxOption | null>
>(({ label, description, value, onChange, containerClassName, ...props }, ref) => {
  const {
    error,
    formItemNativeID,
    formDescriptionNativeID,
    formMessageNativeID,
  } = useFormField();

  return (
    <FormItem className={containerClassName}>
      {!!label && <FormLabel nativeID={formItemNativeID}>{label}</FormLabel>}
      <Combobox
        ref={ref}
        placeholder="Select framework"
        aria-labelledby={formItemNativeID}
        aria-describedby={
          !error
            ? `${formDescriptionNativeID}`
            : `${formDescriptionNativeID} ${formMessageNativeID}`
        }
        aria-invalid={!!error}
        selectedItem={value}
        className="mt-2"
        onSelectedItemChange={onChange}
        {...props}
      />
      {!!description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
});

FormCombobox.displayName = 'FormCombobox';

const FormSelect = React.forwardRef<
  React.ElementRef<typeof Select>,
  FormItemProps<typeof Select, SelectOption | null> &
    SelectProps & {
      placeholder: string;
    }
>(({ label, description, placeholder, onChange, containerClassName, ...props }, ref) => {
  const {
    error,
    formItemNativeID,
    formDescriptionNativeID,
    formMessageNativeID,
  } = useFormField();
  const renderItem: RenderSelectItem = React.useCallback(
    ({ item, index }) => <SelectItem item={item} index={index} />,
    [],
  );

  return (
    <FormItem className={containerClassName}>
      {!!label && <FormLabel nativeID={formItemNativeID}>{label}</FormLabel>}
      <Select
        className="mt-2"
        ref={ref}
        aria-labelledby={formItemNativeID}
        aria-describedby={
          !error
            ? `${formDescriptionNativeID}`
            : `${formDescriptionNativeID} ${formMessageNativeID}`
        }
        aria-invalid={!!error}
        onValueChange={onChange}
        {...props}>
        <SelectTrigger placeholder={placeholder} />
        <SelectList renderItem={renderItem} />
      </Select>
      {!!description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
});

FormSelect.displayName = 'FormSelect';

const FormSwitch = React.forwardRef<
  React.ElementRef<typeof Switch>,
  FormItemProps<typeof Switch, boolean>
>(({ label, description, value, onChange, containerClassName, ...props }, ref) => {
  const switchRef = React.useRef<React.ComponentRef<typeof Switch>>(null);
  const {
    error,
    formItemNativeID,
    formDescriptionNativeID,
    formMessageNativeID,
  } = useFormField();

  React.useImperativeHandle(
    ref,
    () => {
      if (!switchRef.current) {
        return {} as React.ComponentRef<typeof Switch>;
      }
      return switchRef.current;
    },
    [switchRef],
  );

  function handleOnLabelPress() {
    onChange?.(!value);
  }

  return (
    <FormItem className={cn('px-1', containerClassName)}>
      <View className="flex-row gap-3 items-center">
        <Switch
          ref={switchRef}
          aria-labelledby={formItemNativeID}
          aria-describedby={
            !error
              ? `${formDescriptionNativeID}`
              : `${formDescriptionNativeID} ${formMessageNativeID}`
          }
          aria-invalid={!!error}
          {...props}
        />
        {!!label && (
          <FormLabel nativeID={formItemNativeID} onPress={handleOnLabelPress}>
            {label}
          </FormLabel>
        )}
      </View>
      {!!description && <FormDescription>{description}</FormDescription>}
      <FormMessage />
    </FormItem>
  );
});

FormSwitch.displayName = 'FormSwitch';

export {
  Form,
  FormCheckbox,
  FormCombobox,
  FormDatePicker,
  FormDescription,
  FormField,
  FormInput,
  FormItem,
  FormLabel,
  FormMessage,
  FormRadioGroup,
  FormSelect,
  FormSwitch,
  FormTextarea,
  useFormField,
};
