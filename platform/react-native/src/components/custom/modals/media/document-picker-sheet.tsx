import React, { forwardRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  pick,
  types,
  DocumentPickerResponse,
} from '@react-native-documents/picker';
import { viewDocument } from '@react-native-documents/viewer';
import { formatSize, MediaAttachment } from '@openpeeps/common';
import { useOpenpeeps } from '@openpeeps/react';
import { Button } from '~/components/ui/button';
import { FileIcon, XIcon, PlusIcon, FileTextIcon } from '~/components/icons';
import { uploadMedia } from '~/lib/uploadMedia';
import { BaseSheet, SheetFooter } from '../common';
import { ThemedText } from '~/components/ui/themed-text';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';

interface DocumentPickerSheetProps {
  onSelect: (documentAttachments: MediaAttachment[]) => void | Promise<void>;
}

export const DocumentPickerSheet = forwardRef<
  BottomSheetModal,
  DocumentPickerSheetProps
>(({ onSelect }, ref) => {
  const [selectedDocs, setSelectedDocs] = useState<DocumentPickerResponse[]>(
    [],
  );
  const [isConfirmLoading, setIsConfirmLoading] = useState(false);
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const createAttachment = openpeepsApi.createMediaAttachmentAction();

  const handlePickDocument = async () => {
    try {
      const results = await pick({
        type: [types.allFiles],
        allowMultiSelection: true,
        mode: 'import',
      });

      setSelectedDocs(prev => {
        const newDocs = results.filter(
          newDoc => !prev.some(p => p.uri === newDoc.uri),
        );
        return [...prev, ...newDocs];
      });
    } catch (err: unknown) {
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'CANCELED'
      ) {
        console.log('User cancelled document picker');
      } else {
        console.log('DocumentPicker Error: ', err);
      }
    }
  };

  const handlePreview = async (doc: DocumentPickerResponse) => {
    try {
      await viewDocument({
        uri: doc.uri,
        headerTitle: doc.name ?? 'Document Preview',
        mimeType: doc.type ?? undefined,
      });
    } catch (error) {
      console.log('Error viewing document:', error);
    }
  };

  const removeDocument = (uri: string) => {
    setSelectedDocs(prev => prev.filter(doc => doc.uri !== uri));
  };

  const resetStates = () => {
    setSelectedDocs([]);
    setIsConfirmLoading(false);
  };

  const onConfirm = async () => {
    setIsConfirmLoading(true);
    try {
      const documentAttachments = await Promise.all(
        selectedDocs.map(async doc => {
          return uploadMedia({
            mediaUri: doc.uri,
            createAttachments: createAttachment,
            type: 'document',
            usage: 'post-document',
            alt: doc.name || 'Document attachment',
            name: doc.name ?? undefined,
            mimeType: doc.type ?? undefined,
          });
        }),
      ).then(attachments => attachments.filter(Boolean) as MediaAttachment[]);

      await onSelect(documentAttachments);

      resetStates();
      bottomSheetClose(ref);
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsConfirmLoading(false);
    }
  };

  const renderDocumentList = () => {
    if (selectedDocs.length === 0) {
      return (
        <View className="flex-1 items-center justify-center py-12 px-4 border-2 border-dashed border-muted rounded-xl mx-4 my-2">
          <View className="bg-muted p-4 rounded-full mb-3">
            <FileTextIcon size={32} className="text-muted-foreground" />
          </View>
          <Button variant="outline" onPress={handlePickDocument}>
            <ThemedText>Upload Document</ThemedText>
          </Button>
        </View>
      );
    }

    return (
      <View className="px-4">
        {selectedDocs.map((doc, index) => (
          <TouchableOpacity
            key={`${doc.uri}-${index}`}
            onPress={() => handlePreview(doc)}
            activeOpacity={0.7}
            className="flex-row items-center justify-between bg-card p-3 rounded-lg mb-2 border border-border">
            <View className="flex-row items-center flex-1 mr-2">
              <View className="bg-muted w-10 h-10 items-center justify-center rounded-md mr-3">
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
                    {t('form.preview')}
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={e => {
                e.stopPropagation();
                removeDocument(doc.uri);
              }}
              className="p-2 bg-muted/50 rounded-full hover:bg-destructive/10">
              <XIcon
                size={16}
                className="text-muted-foreground hover:text-destructive"
              />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        <Button
          variant="ghost"
          className="flex-row items-center justify-center mt-2 border border-dashed border-border"
          onPress={handlePickDocument}>
          <PlusIcon size={16} className="text-foreground mr-2" />
          <Text className="text-foreground font-medium">
            {t('form.documentInput.addMore')}
          </Text>
        </Button>
      </View>
    );
  };

  return (
    <BaseSheet ref={ref}>
      <View className="flex-1">
        <View className="px-4 py-3 border-b border-border mb-2">
          <Text className="text-lg font-semibold text-foreground">
            Upload Document
          </Text>
        </View>

        <ScrollView className="flex-1 h-96">{renderDocumentList()}</ScrollView>

        <SheetFooter
          onCancel={() => {
            resetStates();
            bottomSheetClose(ref);
          }}
          onConfirm={onConfirm}
          disabled={selectedDocs.length === 0 || isConfirmLoading}
          confirmText={
            selectedDocs.length > 0
              ? `${t('configuration.community.upload')} (${selectedDocs.length})`
              : t('common.done')
          }
          isLoading={isConfirmLoading}
        />
      </View>
    </BaseSheet>
  );
});
