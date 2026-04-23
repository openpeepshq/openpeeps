import React, {useEffect} from 'react';
import {dateFormatter} from './formatter';
import {ThemedText} from '../../ui/themed-text';

interface UpdatingDateProps {
  date: string | Date | number;
  formatter?: (date: string | Date | number) => string;
}

export const UpdatingDate = ({
  date,
  formatter = dateFormatter,
}: UpdatingDateProps) => {
  const [formattedDate, setFormattedDate] = React.useState(formatter(date));

  useEffect(() => {
    const interval = setInterval(() => {
      setFormattedDate(formatter(date));
    }, 60000);
    return () => clearInterval(interval);
  }, [date, formatter]);

  return <ThemedText className="">{formattedDate}</ThemedText>;
};
