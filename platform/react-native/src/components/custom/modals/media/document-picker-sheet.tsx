import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  pick,
  types,
  DocumentPickerResponse,
} from '@react-native-documents/picker';
import { viewDocument } from '@react-native-documents/viewer';
import { formatSize, MediaAttachment } from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { Button } from '~/components/ui/button';
import {
  EyeOnIcon,
  FileIcon,
  XIcon,
  PlusIcon,
  FileTextIcon,
} from '~/components/icons';
import Toast from 'react-native-toast-message';
import { uploadMedia } from '~/lib/uploadMedia';
import { AltSheet } from './alt-text-sheet';
import { BaseSheet, SheetFooter } from '../common';
import { ThemedText } from '~/components/ui/themed-text';
import { bottomSheetPresent } from '~/lib/bottom-sheet-ref';
import {
  decodeFileUri,
  dismissSheetForNativeModal,
  isPickerCancelled,
  resolveDocumentMime,
} from '~/lib/mediaUriHelpers';

interface DocumentPickerSheetProps {
  onSelect: (documentAttachments: MediaAttachment[]) => void | Promise<void>;
}

export type DocumentPickerSheetHandle = {
  open: () => Promise<void>;
};

const ATTACHMENT_DOCUMENT_TYPES = [
  types.pdf,
  types.images,
  types.video,
  types.audio,
  types.plainText,
  types.json,
  types.doc,
  types.docx,
  types.ppt,
  types.pptx,
  types.xls,
  types.xlsx,
  types.csv,
  types.zip,
] as const;

function isIgnoredSidecar(doc: DocumentPickerResponse): boolean {
  const raw = doc.name ?? '';
  const lower = raw.toLowerCase();
  if (lower.includes('.metadata')) return true;
  if (lower.endsWith('.icloud')) return true;
  if (lower.startsWith('._')) return true;
  const bytes = doc.size ?? 0;
  if (
    bytes > 0 &&
    bytes < 512 &&
    /(^image_\d+|metadata)/i.test(raw)
  ) {
    return true;
  }
  return false;
}

const mergePickedDocs = (
  prev: DocumentPickerResponse[],
  results: DocumentPickerResponse[],
): DocumentPickerResponse[] => {
  const newDocs = results.filter(
    newDoc =>
      !isIgnoredSidecar(newDoc) && !prev.some(p => p.uri === newDoc.uri),
  );
  return [...prev, ...newDocs];
};

export const DocumentPickerSheet = forwardRef<
  DocumentPickerSheetHandle,
  DocumentPickerSheetProps
>(({ onSelect }, ref) => {
  const sheetRef = useRef<BottomSheetModal>(null);
  const descriptionSheetRef = useRef<BottomSheetModal>(null);

  const [selectedDocs, setSelectedDocs] = useState<DocumentPickerResponse[]>(
    [],
  );
  const [descriptions, setDescriptions] = useState<Record<string, string>>({});
  const [editingDocUri, setEditingDocUri] = useState<string | null>(null);
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const createAttachment = openpeepsApi.createMediaAttachmentAction();

  const pickDocuments = useCallback(
    async (dismissSheetFirst: boolean): Promise<DocumentPickerResponse[]> => {
      if (dismissSheetFirst) {
        await dismissSheetForNativeModal(sheetRef);
      }

      const results = await pick({
        type: [...ATTACHMENT_DOCUMENT_TYPES],
        allowMultiSelection: true,
        mode: 'import',
      });

      setSelectedDocs(prev => mergePickedDocs(prev, results));
      return results;
    },
    [],
  );

  const open = useCallback(async () => {
    try {
      const results = await pickDocuments(false);
      if (results.length > 0) {
        bottomSheetPresent(sheetRef);
      }
    } catch (error) {
      if (!isPickerCancelled(error)) {
        console.log('DocumentPicker Error: ', error);
      }
    }
  }, [pickDocuments]);

  useImperativeHandle(ref, () => ({ open }), [open]);

  const handlePickDocument = async () => {
    try {
      await pickDocuments(true);
      bottomSheetPresent(sheetRef);
    } catch (error) {
      if (!isPickerCancelled(error)) {
        console.log('DocumentPicker Error: ', error);
      }
      bottomSheetPresent(sheetRef);
    }
  };

  const handlePreview = async (doc: DocumentPickerResponse) => {
    try {
      await dismissSheetForNativeModal(sheetRef);
      await viewDocument({
        uri: decodeFileUri(doc.uri),
        headerTitle: doc.name ?? 'Document Preview',
        mimeType: resolveDocumentMime(doc.type, doc.name),
        presentationStyle: 'fullScreen',
      });
      bottomSheetPresent(sheetRef);
    } catch (error) {
      console.log('Error viewing document:', error);
      Toast.show({
        type: 'error',
        text1: t('form.preview', { defaultValue: 'Preview' }),
        text2: t('form.upload.failed', { defaultValue: 'File upload failed' }),
      });
      bottomSheetPresent(sheetRef);
    }
  };

  const openDescriptionEditor = (doc: DocumentPickerResponse) => {
    setEditingDocUri(doc.uri);
    descriptionSheetRef.current?.present();
  };

  const handleDescriptionUpdate = (description: string) => {
    if (editingDocUri) {
      setDescriptions(prev => ({ ...prev, [editingDocUri]: description }));
    }
    setEditingDocUri(null);
    descriptionSheetRef.current?.dismiss();
  };

  const removeDocument = (uri: string) => {
    setSelectedDocs(prev => prev.filter(doc => doc.uri !== uri));
    setDescriptions(prev => {
      const next = { ...prev };
      delete next[uri];
      return next;
    });
  };

  const resetStates = () => {
    setSelectedDocs([]);
    setDescriptions({});
    setEditingDocUri(null);
    setIsConfirmLoading(false);
  };

  const onConfirm = async () => {
    setIsConfirmLoading(true);
    try {
      const documentAttachments = await Promise.all(
        selectedDocs.map(async doc => {
          const description =
            descriptions[doc.uri]?.trim() || doc.name || 'Document attachment';
          return uploadMedia({
            mediaUri: doc.uri,
            createAttachments: createAttachment,
            type: 'document',
            usage: 'post-document',
            alt: description,
            name: doc.name ?? undefined,
            mimeType: doc.type ?? undefined,
          });
        }),
      ).then(attachments => attachments.filter(Boolean) as MediaAttachment[]);

      if (documentAttachments.length === 0 && selectedDocs.length > 0) {
        Toast.show({
          type: 'error',
          text1: t('form.upload.failed', {
            defaultValue: 'File upload failed',
          }),
        });
        return;
      }

      await onSelect(documentAttachments);

      resetStates();
      sheetRef.current?.close();
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const editingDoc = selectedDocs.find(doc => doc.uri === editingDocUri);

  const renderDocumentList = () => {
    if (selectedDocs.length === 0) {
      return (
        <View className="flex-1 items-center justify-center py-12 px-4 border-2 border-dashed border-muted rounded-xl mx-4 my-2">
          <View className="bg-surface p-4 rounded-full mb-3">
            <FileTextIcon size={32} className="text-muted-foreground" />
          </View>
          <Button variant="outline" onPress={handlePickDocument}>
            <ThemedText>
              {t('form.documentInput.pickPrompt', {
                defaultValue: 'Choose files',
              })}
            </ThemedText>
          </Button>
        </View>
      );
    }

    return (
      <View className="px-4">
        {selectedDocs.map((doc, index) => (
          <View
            key={`${doc.uri}-${index}`}
            className="flex-row items-center justify-between bg-surface p-3 rounded-lg mb-2 border border-border">
            <TouchableOpacity
              onPress={() => openDescriptionEditor(doc)}
              activeOpacity={0.7}
              className="flex-row items-center flex-1 mr-2">
              <View className="bg-surface w-10 h-10 items-center justify-center rounded-md mr-3">
                <FileIcon size={20} className="text-foreground" />
              </View>
              <View className="flex-1">
                <Text
                  className="text-foreground font-medium text-sm"
                  numberOfLines={1}
                  ellipsizeMode="middle">
                  {doc.name ?? 'Untitled'}
                </Text>
                <View className="flex-row items-center mt-0.5">
                  <Text className="text-muted-foreground text-xs">
                    {formatSize(doc.size || 0)}
                  </Text>
                  <Text className="text-muted-foreground/50 text-[10px] ml-2">
                    {descriptions[doc.uri]?.trim()
                      ? t('form.uploadEditModal.description.altText')
                      : t('form.uploadEditModal.description.placeholder')}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <View className="flex-row items-center gap-1">
              <TouchableOpacity
                onPress={() => handlePreview(doc)}
                accessibilityRole="button"
                accessibilityLabel={t('form.preview')}
                className="p-2 bg-surface/50 rounded-full">
                <EyeOnIcon size={16} className="text-muted-foreground" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => removeDocument(doc.uri)}
                accessibilityRole="button"
                accessibilityLabel={t('posts.attachments.deleteTitle', {
                  defaultValue: 'Delete attachment',
                })}
                className="p-2 bg-surface/50 rounded-full">
                <XIcon size={16} className="text-muted-foreground" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <Button
          variant="ghost"
          className="flex-row items-center justify-center mt-2 border border-dashed border-border"
          onPress={handlePickDocument}>
          <PlusIcon size={16} className="text-foreground mr-2" />
          <Text className="text-foreground font-medium">
            {t('form.documentInput.addMore', {
              defaultValue: 'Add more files',
            })}
          </Text>
        </Button>
      </View>
    );
  };

  return (
    <>
      <BaseSheet ref={sheetRef}>
        <View className="flex-1">
          <View className="px-4 py-3 border-b border-border mb-2">
            <Text className="text-lg font-semibold text-foreground">
              {t('form.documentInput.uploadTitle', {
                defaultValue: 'Upload Files',
              })}
            </Text>
          </View>

          <ScrollView className="flex-1 h-96">{renderDocumentList()}</ScrollView>

          <SheetFooter
            onCancel={() => {
              resetStates();
              sheetRef.current?.close();
            }}
            onConfirm={onConfirm}
            disabled={selectedDocs.length === 0 || isConfirmLoading}
            confirmText={
              selectedDocs.length > 0
                ? t('form.documentInput.uploadFilesCount', {
                    count: selectedDocs.length,
                    defaultValue: `Upload Files (${selectedDocs.length})`,
                  })
                : t('common.done')
            }
            isLoading={isConfirmLoading}
          />
        </View>
      </BaseSheet>

      <AltSheet
        ref={descriptionSheetRef}
        variant="document"
        initialAltText={
          editingDoc
            ? descriptions[editingDoc.uri] ?? editingDoc.name ?? ''
            : ''
        }
        onUpdate={handleDescriptionUpdate}
      />
    </>
  );
});
