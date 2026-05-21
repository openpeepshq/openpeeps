import { getServerInfo } from "$lib/server"
import { getContext, setContext } from "svelte";
import { persistedState } from "svelte-persisted-state"
import type { NewPostsState } from "$lib/types";
import type { PostCreationData, PostType } from "@openpeeps/common";

const NEW_POST_STORES_KEY = 'newPosts';

const defaultNewEvent = (): PostCreationData => ({
    type: "event",
    visibility: getServerInfo().publicContent ? 'public' : 'local',
    data: {
        type: 'event',
        start: new Date().toISOString(),
        wholeDay: false,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        jam: {
            type: 'video-call',
            moderators: [],
            videoEnabled: true,
            speakers: [],
            presenters: [],
            audience: [],
            waitingRoom: false
        }
    },
});

const defaultNewNote = (): PostCreationData => ({
    type: "note",
    visibility: getServerInfo().publicContent ? 'public' : 'local',
    data: {
        type: 'note',
        content: ''
    },
});

const defaultNewQuestion = (): PostCreationData => ({
    type: "question",
    visibility: getServerInfo().publicContent ? 'public' : 'local',
    data: {
        type: 'question',
        content: '',
        options: [
            { type: "note", content: "" },
            { type: "note", content: "" },
        ]
    },
});

export const defaultNewArticle = (): PostCreationData => ({
    type: "article",
    visibility: getServerInfo().publicContent ? 'public' : 'local',
    data: {
        type: 'article',
        content: ''
    },
});

export const eventSanitizer = () => {
    const defaultEvent = defaultNewEvent();
    return (event: PostCreationData): PostCreationData => {
        if (event.type !== 'event') {
            return defaultEvent;
        }
        if (event.data.type !== 'event') {
            return defaultEvent;
        }
        return {
            type: 'event',
            visibility: event.visibility,
            data: {
                type: 'event',
                start: event.data.start,
                wholeDay: event.data.wholeDay,
                timeZone: event.data.timeZone,
                jam: event.data.jam,
                url: event.data.url,
                physicalLocation: event.data.physicalLocation,
                image: event.data.image,
                name: event.data.name,
                content: event.data.content,
                end: event.data.end,
                attendeeListPublic: event.data.attendeeListPublic,
                maxAttendees: event.data.maxAttendees,
            },
            audience: event.audience,
            groupId: event.groupId,
            inReplyToId: event.inReplyToId,
        }
    }
}

export const initializeNewPostStores = () => {
    const newJamState = persistedState<PostCreationData>('new-jam-state', defaultNewEvent());

    const newEventState = persistedState<PostCreationData>('new-event-state', defaultNewEvent());

    const newArticleState = persistedState<PostCreationData>('new-article-state', defaultNewArticle());

    const newNewNoteState = persistedState<PostCreationData>('new-note-state', defaultNewNote());

    const newQuestionState = persistedState<PostCreationData>('new-question-state', defaultNewQuestion());

    setContext<NewPostsState>(NEW_POST_STORES_KEY, {
        get jam() {
            return newJamState.current;
        },
        set jam(value) {
            newJamState.current = value;
        },
        resetNewJamState: () => newJamState.reset(),
        get event() {
            return newEventState.current;
        },
        set event(value) {
            newEventState.current = value;
        },
        resetNewEventState: () => newEventState.reset(),
        get article() {
            return newArticleState.current;
        },
        set article(value) {
            newArticleState.current = value;
        },
        resetNewArticleState: () => newArticleState.reset(),
        get note() {
            return newNewNoteState.current;
        },
        set note(value) {
            newNewNoteState.current = value;
        },
        resetNewNoteState: () => newNewNoteState.reset(),
        get question() {
            return newQuestionState.current;
        },
        set question(value) {
            newQuestionState.current = value;
        },
        resetNewQuestionState: () => newQuestionState.reset(),
    });

}

export const resetStore = (type: PostType) => {
    const stores = getNewPostStores();

    if (!stores) {
        return;
    }
    switch (type) {
        case 'event':
            stores.resetNewEventState()
            return;

        case 'note':
            stores.resetNewEventState()
            return;

        case 'question':
            stores.resetNewQuestionState();
            return;

        case 'article':
            stores.resetNewArticleState();
            return;

        default:
            return;
    }
};

export const getNewPostStores = () => getContext<NewPostsState>(NEW_POST_STORES_KEY);