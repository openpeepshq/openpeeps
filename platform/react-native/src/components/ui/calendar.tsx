
import * as React from 'react';
import { LocaleConfig, Calendar as RNCalendar } from 'react-native-calendars';
import { useOpenPeepsTheme } from '~/theme/OpenPeepsThemeProvider';
import { OpenPeepsTheme } from '~/theme/types';


function Calendar({ theme, ...props }: React.ComponentProps<typeof RNCalendar>) {
  const { colors } = useOpenPeepsTheme();

  return (
    <RNCalendar
      theme={getTheme(colors, theme)}
      {...props}
    />
  );
}

const getTheme = (
  colors: OpenPeepsTheme['colors'],
  customTheme?: React.ComponentProps<typeof RNCalendar>['theme']
): React.ComponentProps<typeof RNCalendar>['theme'] => ({
  backgroundColor: colors.background,
  calendarBackground: colors.card,
  textSectionTitleColor: colors.foreground,
  selectedDayBackgroundColor: colors.primary,
  selectedDayTextColor: colors['primary-foreground'],
  todayTextColor: colors.primary,
  dayTextColor: colors.foreground,
  textDisabledColor: colors.alpha,
  monthTextColor: colors.foreground,
  textMonthFontWeight: '500',
  arrowColor: colors.primary,
  ...customTheme,
});

LocaleConfig.locales.en = {
  monthNames: [
    'January',
    'Febuary',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'Septemeber',
    'October',
    'November',
    'December',
  ],
  monthNamesShort: [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sept',
    'Oct',
    'Nov',
    'Dec',
  ],
  dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thur', 'Fri', 'Sat'],
  today: 'Today',
};

LocaleConfig.locales.fr = {
  monthNames: [
    'Janvier',
    'Février',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juillet',
    'Août',
    'Septembre',
    'Octobre',
    'Novembre',
    'Décembre',
  ],
  monthNamesShort: [
    'Janv.',
    'Févr.',
    'Mars',
    'Avril',
    'Mai',
    'Juin',
    'Juil.',
    'Août',
    'Sept.',
    'Oct.',
    'Nov.',
    'Déc.',
  ],
  dayNames: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
  dayNamesShort: ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'],
  today: "Aujourd'hui",
};

export { Calendar, LocaleConfig };
