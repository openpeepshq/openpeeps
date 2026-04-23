import { VisibilityType } from '@openpeeps/common';
import { Globe, LucideIcon, UserCheck, Users, WashingMachine } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';

export const useAudienceChoices: (type: 'event' | 'post') => {
    title: string;
    description: string;
    value: VisibilityType;
    icon: LucideIcon;
}[] = (type) => {
    const { t } = useTranslation();
    const prefix = `visibility.${type}.`;
    const i = (key: string) => t(`${prefix}${key}`);

    return [
        {
            title: i('public.title'),
            description: i('public.description'),
            value: 'public',
            icon: Globe,
        },
        {
            title: i('local.title'),
            description: i('local.description'),
            value: 'local',
            icon: WashingMachine,
        },
        {
            title: i('group.title'),
            description: i('group.description'),
            value: 'group',
            icon: Users,
        },
        {
            title: i('direct.title'),
            description: i('direct.description'),
            value: 'direct',
            icon: UserCheck,
        },

    ];
};
