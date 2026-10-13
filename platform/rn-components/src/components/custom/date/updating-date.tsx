import React, { useEffect } from 'react';
import { dateFormatter } from './formatter';
import { ThemedText } from '../../ui/themed-text';
import { cn } from '../../../lib/utils';

interface UpdatingDateProps {
  date: string | Date | number;
  formatter?: (date: string | Date | number) => string;
  className?: string;
}

export const UpdatingDate = ({
  date,
  formatter = dateFormatter,
  className,
}: UpdatingDateProps) => {
  const [formattedDate, setFormattedDate] = React.useState(formatter(date));

  useEffect(() => {
    const interval = setInterval(() => {
      setFormattedDate(formatter(date));
    }, 60000);
    return () => clearInterval(interval);
  }, [date, formatter]);

  return (
    <ThemedText className={cn('text-sm', className)}>
      {formattedDate}
    </ThemedText>
  );
};
