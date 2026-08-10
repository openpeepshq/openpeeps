import React from 'react';
import type { Article, PublicPost } from '@openpeepshq/common/types';
import { Image, View } from 'react-native';
import { ThemedText } from '~/components/ui/themed-text';
import { OpenPeepsMarkdown } from '~/components/custom/markdown';
import { useMemo } from 'react';
import { firstNWords } from '@openpeepshq/common';
import { Button } from '~/components/ui/button';
import { ArrowRightIcon } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '~/components/navigation/types';
import { useTranslation } from 'react-i18next';
import { CachedImage } from '~/components/custom/common';

interface Props {
    post: PublicPost;
}

export const FeedArticle = ({ post }: Props) => {

    const article = useMemo(() => post.data as Article, [post]);

    const previewContent = useMemo(() => firstNWords(article.content, 50), [article.content]);
    const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
    const { t } = useTranslation();

    return (<View className="flex flex-col gap-2">
        {article.image && (
            <CachedImage
                url={article.image}
                className="w-full h-72"
                resizeMode="cover" 
            />
        )}
        <ThemedText className="text-xl font-bold">{article.title}</ThemedText>
        <OpenPeepsMarkdown
            source={previewContent}
            linkPreviewMode="none"
        />
        <View className="w-full flex flex-row justify-end">
            <Button
                onPress={() => navigation.navigate('Post', { id: post.id })}
                className="flex flex-row gap-2 w-48"
            >
                <ThemedText>{t('posts.article.readMore')}</ThemedText>
                <ArrowRightIcon className="w-4 h-4" />
            </Button>
        </View>
    </View>);
};
