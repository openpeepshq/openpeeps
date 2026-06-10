export const dateFormatter = (dateSource: string | Date | number): string => {
  const currentDate = new Date();
  const inputDate = dateSource instanceof Date ? dateSource : new Date(dateSource);
  const timeDiff = currentDate.getTime() - inputDate.getTime();

  if (timeDiff < -60 * 60 * 1000) {
    return `on ${inputDate.toLocaleDateString()} at ${inputDate.toLocaleTimeString()}`;
  } else if (timeDiff < -60 * 1000) {
    const minutes = Math.abs(Math.floor(timeDiff / (60 * 1000)));
    return `in ${minutes} minutes `;
  } else if (timeDiff < 60 * 1000) {
    return 'now';
  } else if (timeDiff < 60 * 60 * 1000) {
    const minutes = Math.floor(timeDiff / (60 * 1000));
    return `${minutes}m ago`;
  }
  return `${inputDate.toLocaleDateString()} ${inputDate.toLocaleTimeString()}`;
};

export const stopWatchFormatter = (duration: number): string => {
  const totalSeconds = Math.floor(duration / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};
