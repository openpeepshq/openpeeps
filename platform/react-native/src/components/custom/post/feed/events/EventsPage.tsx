import React from 'react';
import type { PublicPost } from '@openpeepshq/common';
import { TabbedView } from '~/components/ui/tabs';
import { EventsFeed } from './EventsFeed';
import { useTranslation } from 'react-i18next';
import { InfiniteQueryResult } from '~/types';


interface Props {
    upcomingQuery: InfiniteQueryResult<PublicPost>;
    pastQuery: InfiniteQueryResult<PublicPost>;
    type?: 'event' | 'jam';
}

export const EventsPage = ({ upcomingQuery, pastQuery, type = 'event' }: Props) => {
    const { t } = useTranslation();
    return (
        <TabbedView
            tabs={[
                {
                    label: t('events.feed.upcoming'),
                    value: 'upcoming',
                    component: <EventsFeed query={upcomingQuery} type={type} />,
                },
                {
                    label: t('events.feed.past'),
                    value: 'past',
                    component: <EventsFeed query={pastQuery} type={type} />,
                },
            ]} />
    );
};
